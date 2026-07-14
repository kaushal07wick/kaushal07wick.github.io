// POST /api/upload  { name, content }  — content is base64 of the file bytes.
// Commits the file to images/<sanitized-name> via the GitHub Contents API.
// Auth-guarded: only a logged-in Studio session can upload.

import { requireAuth, json } from "./_auth.js";

const OK_EXT = /\.(png|jpe?g|gif|webp|svg|mp4|webm|mov)$/i;

export async function onRequestPost({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "unauthorized" }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
  const raw = (body.name || "").trim(), content = body.content || "";
  if (!raw || !content) return json({ error: "name and content required" }, 400);

  const m = raw.match(/^(.*?)(\.[a-z0-9]+)$/i);
  if (!m || !OK_EXT.test(raw)) return json({ error: "unsupported file type" }, 400);
  const base = m[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "file";
  const path = `images/${base}${m[2].toLowerCase()}`;

  const gh = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
  const headers = { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "kaushal-studio", Accept: "application/vnd.github+json" };

  let sha;   // overwrite if it already exists
  const head = await fetch(`${gh}?ref=${env.GITHUB_BRANCH}`, { headers });
  if (head.ok) { try { sha = (await head.json()).sha; } catch (e) {} }

  const put = await fetch(gh, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ message: `studio: upload ${path}`, content, branch: env.GITHUB_BRANCH, ...(sha ? { sha } : {}) }),
  });
  if (!put.ok) return json({ error: "github upload failed", detail: (await put.text()).slice(0, 300) }, 502);
  return json({ ok: true, path: `/${path}` });
}
