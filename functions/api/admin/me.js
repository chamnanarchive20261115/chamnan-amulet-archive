import {
  COOKIE_NAME, json, sha256, getCookie
} from "./_shared.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false }, 503);

  const token = getCookie(request, COOKIE_NAME);
  if (!token) return json({ ok: false }, 401);

  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  const session = await env.DB.prepare(
    "SELECT email, role, expires_at FROM admin_sessions WHERE token_hash = ? AND expires_at > ?"
  ).bind(tokenHash, now).first();

  if (!session) return json({ ok: false }, 401);
  return json({
    ok: true,
    admin: { email: session.email, role: session.role },
    expiresAt: session.expires_at
  });
}
