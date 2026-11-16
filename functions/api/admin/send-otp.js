import {
  OTP_TTL_SECONDS, OTP_COOLDOWN_SECONDS,
  json, normalizeEmail, validEmail, sha256, randomOtp,
  findAdmin, requireSameOrigin
} from "./_shared.js";

export async function onRequestPost({ request, env }) {
  const originError = await requireSameOrigin(request);
  if (originError) return originError;

  if (!env.DB || !env.MAILER_URL || !env.MAILER_SHARED_SECRET) {
    return json({ ok: false, error: "Login service is not configured." }, 503);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "Invalid request." }, 400); }

  const email = normalizeEmail(body.email);
  if (!validEmail(email)) {
    return json({ ok: false, error: "請輸入有效的電子郵件地址。" }, 400);
  }

  let admin;
  try { admin = await findAdmin(env, email); }
  catch (error) {
    console.error("Admin lookup configuration error:", error.message);
    return json({ ok: false, error: "管理員資料表設定尚未完成。" }, 503);
  }

  // Do not disclose whether an email address is registered.
  if (!admin) {
    return json({ ok: true, message: "若此信箱具有管理員權限，驗證碼將寄出。" });
  }

  const now = Math.floor(Date.now() / 1000);
  const existing = await env.DB.prepare(
    "SELECT last_sent_at FROM admin_login_otps WHERE email = ?"
  ).bind(email).first();

  if (existing && now - Number(existing.last_sent_at) < OTP_COOLDOWN_SECONDS) {
    return json({ ok: false, error: "請稍候一分鐘再重新寄送驗證碼。" }, 429);
  }

  const code = randomOtp();
  const codeHash = await sha256(env.MAILER_SHARED_SECRET + ":" + email + ":" + code);

  await env.DB.prepare(
    `INSERT INTO admin_login_otps
      (email, code_hash, expires_at, attempts, last_sent_at, created_at)
     VALUES (?, ?, ?, 0, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       code_hash = excluded.code_hash,
       expires_at = excluded.expires_at,
       attempts = 0,
       last_sent_at = excluded.last_sent_at,
       created_at = excluded.created_at`
  ).bind(email, codeHash, now + OTP_TTL_SECONDS, now, now).run();

  try {
    const mailResponse = await fetch(env.MAILER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.MAILER_SHARED_SECRET,
        action: "send_otp",
        to: email,
        code
      })
    });

    const responseText = await mailResponse.text();
    let mailResult = {};
    try { mailResult = JSON.parse(responseText); } catch {}

    if (!mailResponse.ok || mailResult.ok === false || mailResult.success === false) {
      throw new Error("Mailer rejected the request.");
    }
  } catch (error) {
    await env.DB.prepare("DELETE FROM admin_login_otps WHERE email = ?")
      .bind(email).run();
    console.error("OTP delivery failed:", error.message);
    return json({ ok: false, error: "驗證碼寄送失敗，請稍後再試。" }, 502);
  }

  return json({ ok: true, message: "驗證碼已寄出，請檢查電子郵件。" });
}
