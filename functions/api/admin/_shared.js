const COOKIE_NAME = "__Host-chamnan_admin";
const OTP_TTL_SECONDS = 5 * 60;
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const OTP_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers
    }
  });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomOtp() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const item = header.split(";").map(v => v.trim())
    .find(v => v.startsWith(name + "="));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}

function sessionCookie(token, maxAge) {
  return `${COOKIE_NAME}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return new URL(origin).origin === new URL(request.url).origin;
}

async function findAdmin(env, email) {
  const info = await env.DB.prepare("PRAGMA table_info(admins)").all();
  const columns = (info.results || []).map(item => item.name);
  const emailColumn = ["email", "admin_email"].find(name => columns.includes(name));
  const roleColumn = ["role", "admin_role"].find(name => columns.includes(name));

  if (!emailColumn || !roleColumn) {
    throw new Error("admins table must contain email and role columns");
  }

  const rowResult = await env.DB.prepare(
    `SELECT * FROM admins WHERE lower(${emailColumn}) = ? LIMIT 1`
  ).bind(email).all();

  const admin = (rowResult.results || [])[0];
  if (!admin) return null;

  const role = String(admin[roleColumn] || "").trim().toLowerCase();
  if (!["owner", "primary_owner", "editor"].includes(role)) return null;

  const activeColumn = ["is_active", "active", "enabled", "status"]
    .find(name => columns.includes(name));

  if (activeColumn) {
    const activeValue = admin[activeColumn];
    if (activeValue === 0 || activeValue === false ||
        ["0", "false", "inactive", "disabled", "suspended"].includes(
          String(activeValue).toLowerCase()
        )) return null;
  }

  return { email, role: role === "primary_owner" ? "owner" : role };
}

async function requireSameOrigin(request) {
  if (!sameOrigin(request)) return json({ ok: false, error: "Invalid origin." }, 403);
  return null;
}

export {
  COOKIE_NAME, OTP_TTL_SECONDS, SESSION_TTL_SECONDS,
  OTP_COOLDOWN_SECONDS, MAX_OTP_ATTEMPTS,
  json, normalizeEmail, validEmail, sha256, randomOtp, randomToken,
  getCookie, sessionCookie, clearSessionCookie, findAdmin, requireSameOrigin
};
