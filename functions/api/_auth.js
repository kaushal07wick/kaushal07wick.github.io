// Shared auth for the Studio API. Underscore prefix = not a route, importable.
// A login sets an HMAC-signed, HttpOnly session cookie; the API checks it.
const enc = new TextEncoder();

async function sign(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const secretOf = (env) => env.STUDIO_SECRET || env.STUDIO_PASSWORD || "";

export async function makeToken(env) {
  const exp = Date.now() + 12 * 60 * 60 * 1000;           // 12 hours
  return `${exp}.${await sign(secretOf(env), String(exp))}`;
}
export async function validToken(env, token) {
  const [exp, sig] = (token || "").split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return sig === (await sign(secretOf(env), exp));
}
export function readCookie(request, name) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : "";
}
export const sessionCookie = (token) =>
  `studio_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${12 * 60 * 60}`;

export async function requireAuth(request, env) {
  return validToken(env, readCookie(request, "studio_session"));
}
export const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...headers } });
