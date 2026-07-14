// POST /api/delete  { slug }  — removes a post in ONE atomic commit:
// posts/<slug>.md, blog/<slug>/index.html (if committed), and drops the slug
// from posts/index.json. The build's regen then rebuilds the homepage list.

import { requireAuth, json } from "./_auth.js";

const API = "https://api.github.com";

async function gh(env, path, method = "GET", body) {
  const r = await fetch(API + path, {
    method,
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "kaushal-studio",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (method === "GET" && r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub ${method} ${path} → ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function onRequestPost({ request, env }) {
  try {
    if (!(await requireAuth(request, env))) return json({ error: "unauthorized" }, 401);
    if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO)
      return json({ error: "server not configured (missing GITHUB_* vars)" }, 500);

    const { slug } = await request.json();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug || "")) return json({ error: "bad slug" }, 400);

    const owner = env.GITHUB_OWNER, repo = env.GITHUB_REPO, branch = env.GITHUB_BRANCH || "master";
    const base = `/repos/${owner}/${repo}`;

    // index.json without this slug
    let idx = [];
    const f = await gh(env, `${base}/contents/posts/index.json?ref=${branch}`);
    if (f) { try { idx = JSON.parse(decodeURIComponent(escape(atob(f.content.replace(/\s/g, ""))))); } catch (e) {} }
    if (!Array.isArray(idx)) idx = [];
    idx = idx.filter((x) => x !== slug + ".md");

    const tree = [{ path: "posts/index.json", mode: "100644", type: "blob", content: JSON.stringify(idx, null, 2) + "\n" }];
    // only stage a deletion for files that actually exist (sha:null removes them)
    for (const path of [`posts/${slug}.md`, `blog/${slug}/index.html`]) {
      if (await gh(env, `${base}/contents/${path}?ref=${branch}`)) tree.push({ path, mode: "100644", type: "blob", sha: null });
    }

    const ref = await gh(env, `${base}/git/ref/heads/${branch}`);
    const baseCommit = ref.object.sha;
    const baseTree = (await gh(env, `${base}/git/commits/${baseCommit}`)).tree.sha;
    const newTree = await gh(env, `${base}/git/trees`, "POST", { base_tree: baseTree, tree });
    const commit = await gh(env, `${base}/git/commits`, "POST", { message: `delete: ${slug}`, tree: newTree.sha, parents: [baseCommit] });
    await gh(env, `${base}/git/refs/heads/${branch}`, "PATCH", { sha: commit.sha });

    return json({ ok: true, commit: commit.sha });
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}
