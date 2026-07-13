// POST /api/login  — check the password, set a signed session cookie.
import { makeToken, sessionCookie, json } from "./_auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.STUDIO_PASSWORD) return json({ error: "login not configured (set STUDIO_PASSWORD)" }, 500);
  const { password } = await request.json().catch(() => ({}));
  if (!password || password !== env.STUDIO_PASSWORD) return json({ error: "wrong password" }, 401);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(await makeToken(env)) });
}
