#!/usr/bin/env python3
"""Local, single-user CMS for the blog.

Runs on 127.0.0.1 only — it is never exposed to the network and is not part of
the deployed static site (GitHub Pages serves files, it does not run Python), so
there is no public attack surface and no auth to manage. It serves the site plus
an editor with live preview (rendered through the real blog-post.html template,
so what you see is exactly what ships), and on publish it writes posts/<slug>.md,
adds the slug to posts/index.json, and runs the regen script.

    python3 tools/cms.py     # then open http://127.0.0.1:4321

After publishing: review `git status`, commit and push as usual.
"""
import base64, hashlib, json, re, shutil, subprocess, urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs, quote

ROOT  = Path(__file__).resolve().parent.parent
POSTS = ROOT / "posts"
DRAFT = POSTS / "__draft.md"
PORT  = 4321
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
IMG_EXT = {".webp", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".mp4", ".webm", ".mov"}


def frontmatter(md: str) -> dict:
    out = {}
    for line in md.splitlines():
        m = re.match(r"^(title|subtitle|blurb|author|date)\s*:\s*(.+)$", line, re.I)
        if m:
            out[m.group(1).lower()] = m.group(2).strip()
        elif line.lstrip().startswith("# "):
            break
    return out


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def log_message(self, *a):  # keep the console quiet
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")  # always fresh in the editor
        super().end_headers()

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        p = urlparse(self.path)
        if p.path in ("/", "/cms", "/studio", "/studio/"):
            self.path = "/studio/index.html"
            return super().do_GET()
        if p.path == "/cms/list":
            files = json.loads((POSTS / "index.json").read_text())
            out = []
            for f in files:
                fp = POSTS / f
                fm = frontmatter(fp.read_text()) if fp.exists() else {}
                out.append({"slug": re.sub(r"\.md$", "", f),
                            "title": fm.get("title", f), "date": fm.get("date", "")})
            return self._json(out)
        if p.path == "/cms/load":
            slug = (parse_qs(p.query).get("slug") or [""])[0]
            if not SLUG_RE.match(slug):
                return self._json({"error": "bad slug"}, 400)
            fp = POSTS / (slug + ".md")
            if not fp.exists():
                return self._json({"error": "not found"}, 404)
            return self._json({"markdown": fp.read_text()})
        if p.path == "/cms/images":
            imgs = ROOT / "images"
            files = sorted(f"/images/{x.name}" for x in imgs.iterdir()
                           if x.is_file() and x.suffix.lower() in IMG_EXT) if imgs.exists() else []
            return self._json(files)
        if p.path == "/cms/shot":
            target = (parse_qs(p.query).get("url") or [""])[0]
            if not target.startswith(("http://", "https://")):
                return self._json({"error": "bad url"}, 400)
            cdir = ROOT / ".shotcache"; cdir.mkdir(exist_ok=True)
            cf = cdir / (hashlib.md5(target.encode()).hexdigest() + ".img")
            if not cf.exists():
                src = (f"https://api.microlink.io/?url={quote(target, safe='')}"
                       "&screenshot=true&meta=false&embed=screenshot.url")
                try:
                    req = urllib.request.Request(src, headers={"User-Agent": "kaushal-preview"})
                    with urllib.request.urlopen(req, timeout=45) as r:
                        cf.write_bytes(r.read())
                except Exception:
                    return self._json({"error": "upstream"}, 502)
            data = cf.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Cache-Control", "public, max-age=604800")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        return super().do_GET()

    def do_POST(self):
        p = urlparse(self.path)
        raw = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if p.path == "/cms/draft":
            DRAFT.write_text(raw.decode("utf-8"))
            return self._json({"ok": True})
        if p.path == "/cms/upload":
            data = json.loads(raw or b"{}")
            name = (data.get("name") or "").strip()
            content = data.get("content") or ""
            m = re.match(r"^(.*?)(\.[a-z0-9]+)$", name, re.I)
            if not m or m.group(2).lower() not in IMG_EXT or not content:
                return self._json({"error": "unsupported file type"}, 400)
            base = re.sub(r"[^a-z0-9]+", "-", m.group(1).lower()).strip("-") or "file"
            fname = base + m.group(2).lower()
            imgs = ROOT / "images"; imgs.mkdir(exist_ok=True)
            try:
                (imgs / fname).write_bytes(base64.b64decode(content))
            except Exception:
                return self._json({"error": "write failed"}, 500)
            return self._json({"ok": True, "path": f"/images/{fname}"})
        if p.path == "/cms/delete":
            data = json.loads(raw or b"{}")
            slug = (data.get("slug") or "").strip()
            if not SLUG_RE.match(slug):
                return self._json({"error": "bad slug"}, 400)
            (POSTS / (slug + ".md")).unlink(missing_ok=True)
            idx_path = POSTS / "index.json"
            idx = [x for x in json.loads(idx_path.read_text()) if x != slug + ".md"]
            idx_path.write_text(json.dumps(idx, indent=2) + "\n")
            bdir = ROOT / "blog" / slug
            if bdir.exists():
                shutil.rmtree(bdir)
            r = subprocess.run(["bash", "tools/regen-blog-pages.sh"], cwd=str(ROOT), capture_output=True, text=True)
            if r.returncode != 0:
                return self._json({"error": "regen failed", "detail": r.stderr}, 500)
            return self._json({"ok": True})
        if p.path == "/cms/publish":
            data = json.loads(raw or b"{}")
            slug = (data.get("slug") or "").strip()
            md   = data.get("markdown") or ""
            if not SLUG_RE.match(slug):
                return self._json({"error": "slug must be lowercase letters, numbers and hyphens"}, 400)
            (POSTS / (slug + ".md")).write_text(md)
            idx_path = POSTS / "index.json"
            idx = json.loads(idx_path.read_text())
            if slug + ".md" not in idx:
                idx.append(slug + ".md")
                idx_path.write_text(json.dumps(idx, indent=2) + "\n")
            r = subprocess.run(["bash", "tools/regen-blog-pages.sh"], cwd=str(ROOT),
                               capture_output=True, text=True)
            if DRAFT.exists():
                DRAFT.unlink()
            if r.returncode != 0:
                return self._json({"error": "regen failed", "detail": r.stderr}, 500)
            return self._json({"ok": True, "url": f"/blog/{slug}/", "log": r.stdout})
        return self._json({"error": "unknown route"}, 404)


if __name__ == "__main__":
    print(f"\n  Blog CMS  →  http://127.0.0.1:{PORT}\n  local only · Ctrl-C to stop\n")
    try:
        ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\n  stopped.\n")
