// GET /api/shot?url=...  — live screenshot, cached at Cloudflare's edge.
//
// Runtime (reflects the current target site), but each result is cached at the
// edge for a week with background revalidation, so every hover after the first
// is instant and upstream is hit ~once per link per week. Public + read-only;
// only http(s) targets, only images returned.
//
// Tries screenshot providers in order — some block datacenter IPs, so the
// fallback matters when running from a Cloudflare Worker.

const UA = "Mozilla/5.0 (compatible; kaushal-preview/1.0; +https://kaushalchoudhary.com)";
const PROVIDERS = [
  (u) => `https://image.thum.io/get/width/640/noanimate/${u}`,
  (u) => `https://api.microlink.io/?url=${encodeURIComponent(u)}&screenshot=true&meta=false&embed=screenshot.url`,
];

export async function onRequestGet({ request, ctx }) {
  const target = new URL(request.url).searchParams.get("url") || "";
  if (!/^https?:\/\//i.test(target)) return new Response("bad url", { status: 400 });

  const cache = caches.default;
  const key = new Request(new URL(request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;

  for (const make of PROVIDERS) {
    try {
      const upstream = await fetch(make(target), { headers: { "User-Agent": UA } });
      const ct = upstream.headers.get("Content-Type") || "";
      if (upstream.ok && /^image\//.test(ct)) {
        const res = new Response(upstream.body, {
          headers: {
            "Content-Type": ct,
            "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
            "Access-Control-Allow-Origin": "*",
          },
        });
        ctx.waitUntil(cache.put(key, res.clone()));
        return res;
      }
    } catch (e) { /* try the next provider */ }
  }
  return new Response("no screenshot", { status: 502 });
}
