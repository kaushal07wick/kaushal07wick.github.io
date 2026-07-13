// Cloudflare Pages Function — GET /api/images
// Lists /images from the GitHub repo so the Studio's media picker works when hosted.
// Uses the same GITHUB_* env vars as publish.js.
import { requireAuth, json } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  try {
    if (!(await requireAuth(request, env))) return json({ error: "unauthorized" }, 401);
    const owner = env.GITHUB_OWNER, repo = env.GITHUB_REPO, branch = env.GITHUB_BRANCH || "master";
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/images?ref=${branch}`, {
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "kaushal-studio",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!r.ok) return json([]);
    const files = await r.json();
    const ok = /\.(webp|png|jpe?g|gif|svg|mp4|webm|mov)$/i;
    return json(
      (Array.isArray(files) ? files : [])
        .filter(f => f.type === "file" && ok.test(f.name))
        .map(f => "/images/" + f.name)
        .sort()
    );
  } catch (e) { return json([]); }
}
