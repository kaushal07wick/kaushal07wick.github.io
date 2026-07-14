// GET /api/title?url=…  — fetch a page and return its <title>, so Studio can
// turn a pasted link into a titled markdown link. Auth-guarded (admin-only).

import { requireAuth, json } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "unauthorized" }, 401);

  const url = new URL(request.url).searchParams.get("url") || "";
  if (!/^https?:\/\//i.test(url)) return json({ error: "bad url" }, 400);

  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; kaushal-studio/1.0)" },
      cf: { cacheTtl: 3600 },
    });
    const html = (await r.text()).slice(0, 20000);           // title lives in <head>; cap the read
    const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const t  = og?.[1] || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "";
    const title = t.replace(/\s+/g, " ").trim();
    return json({ ok: true, title, url });
  } catch (e) {
    return json({ error: "fetch failed" }, 502);
  }
}
