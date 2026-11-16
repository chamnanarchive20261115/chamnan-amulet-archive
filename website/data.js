(function () {
  "use strict";

  const grid = document.getElementById("amuletGrid");
  const empty = document.getElementById("empty");
  const search = document.getElementById("searchInput");

  if (!grid || !empty || !search) {
    console.error("Chamnan Archive: Required HTML elements missing.");
    return;
  }

  let records = [];
  let research = {};
  let language = "zh";

  const researchFiles = {
    material: "material-variants.json",
    edition: "edition-quantity.json",
    history: "issuance-history.json",
    beliefs: "spiritual-beliefs.json"
  };

  const labels = {
    zh: {
      production: "製作年份",
      release: "發行年份",
      material: "聖物材質",
      quantity: "發行數量",
      ingredients: "製作聖料",
      purpose: "發心目的",
      temple: "發行寺廟",
      attributes: "傳統信仰功效",
      images: "聖物照片",
      front: "正面",
      back: "背面",
      side: "側面",
      details: "細節",
      sources: "歷史文獻與資料來源",
      research: "深入考證資料",
      variants: "材質與版本研究",
      edition: "發行數量與版別研究",
      history: "發行歷史與製作目的",
      beliefs: "傳統信仰與功效研究",
      pending: "尚待考證",
      noPhoto: "尚未取得經授權的典藏照片",
      noData: "目前沒有符合條件的資料。",
      noMatch: "沒有找到符合搜尋條件的聖物。",
      status: "考證狀態",
      source: "查看原始來源"
    },
    en: {
      production: "Production Year",
      release: "Release Year",
      material: "Material",
      quantity: "Quantity Issued",
      ingredients: "Sacred Ingredients",
      purpose: "Purpose of Creation",
      temple: "Issuing Temple",
      attributes: "Traditional Spiritual Attributes",
      images: "Amulet Photographs",
      front: "Front",
      back: "Back",
      side: "Side",
      details: "Details",
      sources: "Historical Sources",
      research: "Research Records",
      variants: "Material and Edition Research",
      edition: "Quantity and Edition Research",
      history: "Issuance History and Purpose",
      beliefs: "Traditional Beliefs and Attributes",
      pending: "Pending Verification",
      noPhoto: "Authorized archival photographs not yet available",
      noData: "No records available.",
      noMatch: "No matching amulets found.",
      status: "Verification Status",
      source: "View Original Source"
    },
    th: {
      production: "ปีที่จัดสร้าง",
      release: "ปีที่ออกให้บูชา",
      material: "เนื้อวัตถุมงคล",
      quantity: "จำนวนที่ออกให้บูชา",
      ingredients: "มวลสาร",
      purpose: "วัตถุประสงค์การจัดสร้าง",
      temple: "วัดที่ออกวัตถุมงคล",
      attributes: "พุทธคุณตามความเชื่อ",
      images: "ภาพวัตถุมงคล",
      front: "ด้านหน้า",
      back: "ด้านหลัง",
      side: "ด้านข้าง",
      details: "รายละเอียด",
      sources: "เอกสารและแหล่งอ้างอิง",
      research: "ข้อมูลการศึกษาค้นคว้า",
      variants: "การศึกษาเนื้อและรุ่น",
      edition: "การศึกษาจำนวนและรุ่น",
      history: "ประวัติการจัดสร้าง",
      beliefs: "ความเชื่อและพุทธคุณ",
      pending: "รอตรวจสอบ",
      noPhoto: "ยังไม่มีภาพถ่ายที่ได้รับอนุญาต",
      noData: "ยังไม่มีข้อมูล",
      noMatch: "ไม่พบข้อมูลที่ตรงกับการค้นหา",
      status: "สถานะการตรวจสอบ",
      source: "ดูแหล่งข้อมูลต้นฉบับ"
    }
  };

  function value(obj) {
    if (obj == null) return "";
    if (typeof obj !== "object") return String(obj);

    return obj[language] ||
      obj["zh-TW"] ||
      obj.en ||
      obj.th ||
      "";
  }

  function year(obj) {
    if (!obj) return "";

    if (obj.buddhist_era && obj.gregorian) {
      return language === "zh"
        ? "佛曆 " + obj.buddhist_era + "／西元 " + obj.gregorian
        : language === "en"
        ? "B.E. " + obj.buddhist_era + " / " + obj.gregorian
        : "พ.ศ. " + obj.buddhist_era + " / ค.ศ. " + obj.gregorian;
    }

    return obj.buddhist_era || obj.gregorian || "";
  }

  function addText(parent, tag, text, className) {
    const el = document.createElement(tag);
    el.textContent = text || "";

    if (className) el.className = className;

    parent.appendChild(el);
    return el;
  }

  function normalizeUrl(url) {
    if (!url) return "";

    // 修正舊資料中可能存在的 Markdown 連結格式
    const match = url.match(/^\[([^\]]+)\]\((https?:\/\/.*)\)$/);

    return match ? match[1] : url;
  }

  function addField(parent, label, text) {
    const line = document.createElement("div");
    addText(line, "b", label);
    addText(line, "span", text || labels[language].pending);
    parent.appendChild(line);
  }

  function addGallery(parent, record) {
    const l = labels[language];

    addText(parent, "h4", l.images);

    const gallery = document.createElement("div");
    gallery.className = "amulet-gallery";

    const images = record.images || {};

    const items = [
      ["front", l.front],
      ["back", l.back],
      ["side", l.side],
      ["details", l.details]
    ];

    let count = 0;

    items.forEach(function (item) {
      const key = item[0];
      const paths = Array.isArray(images[key])
        ? images[key]
        : images[key] ? [images[key]] : [];

      paths.forEach(function (path) {
        if (!path) return;

        count++;

        const img = document.createElement("img");
        img.src = path.startsWith("http")
          ? path
          : "../" + path.replace(/^\/+/, "");
        img.alt = item[1];
        img.loading = "lazy";
        img.onerror = function () {
          img.style.display = "none";
        };

        gallery.appendChild(img);
      });
    });

    if (!count) {
      const placeholder = document.createElement("div");
      placeholder.className = "photo-placeholder";
      placeholder.textContent = l.noPhoto;
      gallery.appendChild(placeholder);
    }

    parent.appendChild(gallery);
  }

  function addSources(parent, record) {
    const l = labels[language];

    addText(parent, "h4", l.sources);

    const list = document.createElement("ul");

    (record.sources || []).forEach(function (source) {
      const li = document.createElement("li");
      const url = normalizeUrl(source.url);

      addText(li, "span", source.title || "Reference");

      if (url && /^https?:\/\//i.test(url)) {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = l.source;
        li.appendChild(link);
      }

      if (source.note) {
        addText(li, "p", source.note);
      }

      list.appendChild(li);
    });

    parent.appendChild(list);
  }

  function addResearch(parent, record) {
    const l = labels[language];

    const section = document.createElement("details");
    addText(section, "summary", l.research);

    const content = document.createElement("div");
    content.className = "amulet-detail";

    const researchMap = [
      ["material", l.variants],
      ["edition", l.edition],
      ["history", l.history],
      ["beliefs", l.beliefs]
    ];

    researchMap.forEach(function (item) {
      const data = research[record.id + ":" + item[0]];

      if (!data) return;

      const detail = document.createElement("details");
      addText(detail, "summary", item[1]);

      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(data, null, 2);
      pre.style.whiteSpace = "pre-wrap";
      pre.style.overflowWrap = "anywhere";
      pre.style.fontSize = "12px";

      detail.appendChild(pre);
      content.appendChild(detail);
    });

    section.appendChild(content);
    parent.appendChild(section);
  }

  function render(list) {
    const l = labels[language];

    grid.innerHTML = "";

    empty.textContent = list.length
      ? ""
      : records.length ? l.noMatch : l.noData;

    empty.style.display = list.length ? "none" : "block";

    list.forEach(function (record) {
      const card = document.createElement("article");
      card.className = "amulet-card";

      const body = document.createElement("div");
      body.className = "amulet-card-body";

      addText(body, "h3", value(record.name) || record.id);
      addText(body, "p", record.id || "");

      const status = document.createElement("p");
      status.textContent =
        l.status + ": " +
        (record.verification_status === "verified"
          ? "Verified"
          : l.pending);

      card.appendChild(body);

      addGallery(body, record);

      const content = document.createElement("div");
      content.className = "amulet-detail";

      const fields = [
        [l.production, year(record.production_year)],
        [l.release, year(record.release_year)],
        [l.material, value(record.material)],
        [
          l.quantity,
          record.quantity_issued &&
          record.quantity_issued.total != null
            ? record.quantity_issued.total + " " +
              (record.quantity_issued.unit || "")
            : ""
        ],
        [l.ingredients, value(record.sacred_ingredients)],
        [l.purpose, value(record.purpose_of_creation)],
        [l.temple, value(record.issuing_temple)],
        [l.attributes, value(record.traditional_spiritual_attributes)]
      ];

      fields.forEach(function (field) {
        addField(content, field[0], field[1]);
      });

      body.appendChild(status);
      body.appendChild(content);

      addSources(body, record);
      addResearch(body, record);

      grid.appendChild(card);
    });
  }

  function filteredRecords() {
    const keyword = search.value.trim().toLowerCase();

    return records.filter(function (record) {
      return JSON.stringify(record)
        .toLowerCase()
        .includes(keyword);
    });
  }

  function setLanguage(lang) {
    if (!labels[lang]) return;

    language = lang;
    render(filteredRecords());
  }

  async function loadResearch(record) {
    const tasks = Object.keys(researchFiles).map(async function (key) {
      const url = "./data/research/" +
        encodeURIComponent(record.id) + "/" +
        researchFiles[key];

      try {
        const response = await fetch(url);

        if (!response.ok) return;

        research[record.id + ":" + key] =
          await response.json();

      } catch (error) {
        console.warn("Research file unavailable:", url);
      }
    });

    await Promise.all(tasks);
  }

  async function init() {
    try {
      const response = await fetch("./data/amulets.json");

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const database = await response.json();

      records = database.records || [];

      window.chamnanDatabase = database;

      await Promise.all(records.map(loadResearch));

      render(records);

      search.addEventListener("input", function () {
        render(filteredRecords());
      });

      document.querySelectorAll("[data-lang]").forEach(function (button) {
        button.addEventListener("click", function () {
          setLanguage(button.dataset.lang);
        });
      });

      console.log("Chamnan Archive connected.");
      console.log("Total records:", records.length);
      console.log("Research files loaded:", Object.keys(research).length);

    } catch (error) {
      empty.textContent =
        "資料庫連線失敗：" + error.message;

      console.error(error);
    }
  }

  init();

})();
