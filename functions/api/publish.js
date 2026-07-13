// Cloudflare Pages Function — POST /api/publish
//
// Protected by Cloudflare Access (only you can reach it). Commits the post's
// markdown + updates posts/index.json in the GitHub repo, in ONE atomic commit.
// The Pages build then runs tools/regen-blog-pages.sh to generate the pages.
//
// Required Pages environment variables (Settings → Environment variables):
//   GITHUB_TOKEN   fine-grained PAT with Contents: Read and write on the repo
//   GITHUB_OWNER   e.g. kaushal07wick
//   GITHUB_REPO    e.g. kaushal07wick.github.io
//   GITHUB_BRANCH  e.g. master   (optional, defaults to "master")

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
  if (!r.ok) throw new Error(`GitHub ${method} ${path} → ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function onRequestPost({ request, env }) {
  try {
    if (!(await requireAuth(request, env))) return json({ error: "unauthorized" }, 401);
    if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO)
      return json({ error: "server not configured (missing GITHUB_* vars)" }, 500);

    const { slug, markdown } = await request.json();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug || "")) return json({ error: "slug must be lowercase letters, numbers and hyphens" }, 400);
    if (!markdown || !markdown.trim()) return json({ error: "empty post" }, 400);

    const owner = env.GITHUB_OWNER, repo = env.GITHUB_REPO, branch = env.GITHUB_BRANCH || "master";
    const base = `/repos/${owner}/${repo}`;

    // current index.json → append the slug if new
    let idx = [];
    try {
      const f = await gh(env, `${base}/contents/posts/index.json?ref=${branch}`);
      idx = JSON.parse(decodeURIComponent(escape(atob(f.content.replace(/\s/g, "")))));
    } catch (e) { idx = []; }
    if (!Array.isArray(idx)) idx = [];
    if (!idx.includes(slug + ".md")) idx.push(slug + ".md");

    // one atomic commit of both files via the Git Data API
    const ref = await gh(env, `${base}/git/ref/heads/${branch}`);
    const baseCommit = ref.object.sha;
    const baseTree = (await gh(env, `${base}/git/commits/${baseCommit}`)).tree.sha;
    const newTree = await gh(env, `${base}/git/trees`, "POST", {
      base_tree: baseTree,
      tree: [
        { path: `posts/${slug}.md`,   mode: "100644", type: "blob", content: markdown },
        { path: "posts/index.json",   mode: "100644", type: "blob", content: JSON.stringify(idx, null, 2) + "\n" },
      ],
    });
    const commit = await gh(env, `${base}/git/commits`, "POST", {
      message: `post: ${slug}`, tree: newTree.sha, parents: [baseCommit],
    });
    await gh(env, `${base}/git/refs/heads/${branch}`, "PATCH", { sha: commit.sha });

    return json({ ok: true, url: `/blog/${slug}/`, commit: commit.sha });
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}
