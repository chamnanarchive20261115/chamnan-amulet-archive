import {
  MAX_OTP_ATTEMPTS, SESSION_TTL_SECONDS,
  json, normalizeEmail, validEmail, sha256, randomToken,
  sessionCookie, findAdmin, requireSameOrigin
} from "./_shared.js";

export async function onRequestPost({ request, env }) {
  const originError = await requireSameOrigin(request);
  if (originError) return originError;

  if (!env.DB || !env.MAILER_SHARED_SECRET) {
    return json({ ok: false, error: "Login service is not configured." }, 503);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "Invalid request." }, 400); }

  const email = normalizeEmail(body.email);
  const code = String(body.code || "").trim();
  if (!validEmail(email) || !/^\d{6}$/.test(code)) {
    return json({ ok: false, error: "電子郵件或六位數驗證碼不正確。" }, 400);
  }

  let admin;
  try { admin = await findAdmin(env, email); }
  catch (error) {
    console.error("Admin lookup configuration error:", error.message);
    return json({ ok: false, error: "管理員資料表設定尚未完成。" }, 503);
  }
  if (!admin) return json({ ok: false, error: "電子郵件或驗證碼不正確。" }, 401);

  const otp = await env.DB.prepare(
    "SELECT code_hash, expires_at, attempts FROM admin_login_otps WHERE email = ?"
  ).bind(email).first();

  const now = Math.floor(Date.now() / 1000);
  if (!otp || Number(otp.expires_at) < now ||
      Number(otp.attempts) >= MAX_OTP_ATTEMPTS) {
    await env.DB.prepare("DELETE FROM admin_login_otps WHERE email = ?")
      .bind(email).run();
    return json({ ok: false, error: "驗證碼已過期，請重新索取。" }, 401);
  }

  const submittedHash = await sha256(
    env.MAILER_SHARED_SECRET + ":" + email + ":" + code
  );

  if (submittedHash !== otp.code_hash) {
    await env.DB.prepare(
      "UPDATE admin_login_otps SET attempts = attempts + 1 WHERE email = ?"
    ).bind(email).run();
    return json({ ok: false, error: "電子郵件或驗證碼不正確。" }, 401);
  }

  await env.DB.prepare("DELETE FROM admin_login_otps WHERE email = ?")
    .bind(email).run();

  const token = randomToken();
  const tokenHash = await sha256(token);
  const expiresAt = now + SESSION_TTL_SECONDS;

  await env.DB.prepare(
    "INSERT INTO admin_sessions (token_hash, email, role, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(tokenHash, admin.email, admin.role, expiresAt, now).run();

  return json(
    { ok: true, admin: { email: admin.email, role: admin.role }, expiresAt },
    200,
    { "Set-Cookie": sessionCookie(token, SESSION_TTL_SECONDS) }
  );
}
