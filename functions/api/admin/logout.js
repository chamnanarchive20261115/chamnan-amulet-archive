import {
  COOKIE_NAME, json, sha256, getCookie, clearSessionCookie, requireSameOrigin
} from "./_shared.js";

export async function onRequestPost({ request, env }) {
  const originError = await requireSameOrigin(request);
  if (originError) return originError;

  const token = getCookie(request, COOKIE_NAME);
  if (token && env.DB) {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?")
      .bind(await sha256(token)).run();
  }

  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}
