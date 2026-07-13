// GET /api/shot?url=...  — live screenshot, cached at Cloudflare's edge.
//
// Runtime (it reflects the current target site), but the edge caches each result
// for a week with background revalidation, so every hover after the first is
// instant and the upstream service is hit ~once per link per week (no rate limits).
// Public + read-only; only http(s) targets, only images are returned.

const SHOT = (u) =>
  `https://api.microlink.io/?url=${encodeURIComponent(u)}&screenshot=true&meta=false&embed=screenshot.url`;

export async function onRequestGet({ request, ctx }) {
  const target = new URL(request.url).searchParams.get("url") || "";
  if (!/^https?:\/\//i.test(target)) return new Response("bad url", { status: 400 });

  const cache = caches.default;
  const key = new Request(new URL(request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;

  let upstream;
  try { upstream = await fetch(SHOT(target), { headers: { "User-Agent": "kaushal-preview" } }); }
  catch (e) { return new Response("upstream error", { status: 502 }); }
  if (!upstream.ok || !/^image\//.test(upstream.headers.get("Content-Type") || ""))
    return new Response("no screenshot", { status: 502 });

  const res = new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "image/png",
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}
