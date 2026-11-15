(function () {
  const grid = document.getElementById("amuletGrid");
  const empty = document.getElementById("empty");
  const search = document.getElementById("searchInput");

  let records = [];
  let language = "zh";

  const labels = {
    zh: {
      production:"製作年份", release:"發行年份",
      images:"聖物圖片", material:"聖物材質",
      quantity:"發行數量", ingredients:"製作的聖料內容",
      purpose:"發心的目的", temple:"發行寺廟",
      attributes:"佛牌功效", details:"查看完整資料",
      pending:"尚待考證", noData:"目前尚無正式收錄的聖物資料。",
      noMatch:"沒有找到符合條件的聖物。"
    },
    en: {
      production:"Production Year", release:"Release Year",
      images:"Amulet Photographs", material:"Amulet Material",
      quantity:"Quantity Issued", ingredients:"Sacred Ingredients",
      purpose:"Purpose of Creation", temple:"Issuing Temple",
      attributes:"Traditional Spiritual Attributes",
      details:"View Full Details", pending:"Pending Verification",
      noData:"No officially documented amulets yet.",
      noMatch:"No matching amulets found."
    },
    th: {
      production:"ปีที่จัดสร้าง", release:"ปีที่ออกให้บูชา",
      images:"ภาพวัตถุมงคล", material:"เนื้อวัตถุมงคล",
      quantity:"จำนวนที่ออกให้บูชา",
      ingredients:"มวลสารที่ใช้จัดสร้าง",
      purpose:"วัตถุประสงค์การจัดสร้าง",
      temple:"วัดที่ออกวัตถุมงคล",
      attributes:"พุทธคุณ", details:"ดูข้อมูลทั้งหมด",
      pending:"รอตรวจสอบ", noData:"ยังไม่มีข้อมูลวัตถุมงคลที่บันทึกอย่างเป็นทางการ",
      noMatch:"ไม่พบวัตถุมงคลที่ตรงกับการค้นหา"
    }
  };

  function value(obj) {
    if (obj == null) return "";
    if (typeof obj !== "object") return String(obj);
    return obj[language] || obj["zh-TW"] || obj.en || obj.th || "";
  }

  function year(obj) {
    if (!obj) return "";
    if (obj.buddhist_era && obj.gregorian) {
      return "佛曆 " + obj.buddhist_era +
        " / " + obj.gregorian;
    }
    return obj.buddhist_era || obj.gregorian || "";
  }

  function addText(parent, tag, text) {
    const el = document.createElement(tag);
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  function render(list) {
    grid.innerHTML = "";
    const l = labels[language];

    empty.textContent = list.length ? "" :
      (records.length ? l.noMatch : l.noData);
    empty.style.display = list.length ? "none" : "block";

    list.forEach(function (record) {
      const card = document.createElement("article");
      card.className = "amulet-card";

      const img = document.createElement("img");
      const front = record.images && record.images.front;

      if (front) {
        img.src = front.startsWith("http")
          ? front : "../" + front.replace(/^\/+/, "");
        img.alt = value(record.name);
      } else {
        img.style.display = "none";
      }

      card.appendChild(img);

      const body = document.createElement("div");
      body.className = "amulet-card-body";

      addText(body, "h3", value(record.name) || record.id);
      addText(body, "p", record.id || "");

      const details = document.createElement("details");
      addText(details, "summary", l.details);

      const content = document.createElement("div");
      content.className = "amulet-detail";

      const fields = [
        [l.production, year(record.production_year)],
        [l.release, year(record.release_year)],
        [l.material, value(record.material)],
        [l.quantity, record.quantity_issued &&
          record.quantity_issued.total != null
          ? record.quantity_issued.total + " " +
            (record.quantity_issued.unit || "") : ""],
        [l.ingredients, value(record.sacred_ingredients)],
        [l.purpose, value(record.purpose_of_creation)],
        [l.temple, value(record.issuing_temple)],
        [l.attributes, value(record.traditional_spiritual_attributes)]
      ];

      fields.forEach(function (field) {
        const line = document.createElement("div");
        addText(line, "b", field[0]);
        addText(line, "span", field[1] || l.pending);
        content.appendChild(line);
      });

      details.appendChild(content);
      body.appendChild(details);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  fetch("./data/amulets.json")
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (database) {
      records = database.records || [];
      window.chamnanDatabase = database;
      render(records);

      search.addEventListener("input", function () {
        const keyword = search.value.trim().toLowerCase();
        const matched = records.filter(function (record) {
          return JSON.stringify(record)
            .toLowerCase().includes(keyword);
        });
        render(matched);
      });

      document.querySelectorAll("[data-lang]").forEach(function (button) {
        button.addEventListener("click", function () {
          language = button.dataset.lang;
          render(records.filter(function (record) {
            return JSON.stringify(record).toLowerCase()
              .includes(search.value.trim().toLowerCase());
          }));
        });
      });

      console.log("Chamnan Archive database connected.");
      console.log("Total records:", records.length);
    })
    .catch(function (error) {
      empty.textContent = "資料庫連線失敗：" + error.message;
      console.error(error);
    });
})();
