#!/usr/bin/env bash
# Regenerate everything derived from posts/:
#   1. /blog/<slug>/index.html for every post in posts/index.json, baking the
#      post's title + subtitle into <title>, description, Open Graph and Twitter
#      tags so link previews show the post title (not "Blog Post — Kaushal").
#   2. The Writing list on index.html (between <!-- POSTS:START --> / END),
#      so a newly published post shows up on the homepage automatically.
#
# Run:    bash tools/regen-blog-pages.sh
# Re-run any time you add/edit a post, reorder index.json, or edit blog-post.html.

set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 required" >&2
  exit 1
fi

python3 - <<'PY'
import json, re
from pathlib import Path

ROOT   = Path(".").resolve()
DOMAIN = "https://kaushalchoudhary.com"

def parse_frontmatter(md: str) -> dict:
    out = {}
    for line in md.splitlines():
        m = re.match(r"^(title|subtitle|blurb|author|date|cover|draft)\s*:\s*(.+)$", line, re.IGNORECASE)
        if m:
            out[m.group(1).lower()] = m.group(2).strip()
        elif line.lstrip().startswith("# "):
            break
    return out

def esc(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;"))

template = (ROOT / "blog-post.html").read_text()
files    = json.loads((ROOT / "posts" / "index.json").read_text())

cards = []
print("regenerating per-post pages with social meta tags:")
for i, fname in enumerate(files):
    slug = re.sub(r"\.md$", "", fname)
    md_path = ROOT / "posts" / fname
    if not md_path.exists():
        print(f"  ⚠ skipped (missing): posts/{fname}")
        continue

    md = md_path.read_text()
    fm = parse_frontmatter(md)
    title    = fm.get("title", slug)
    subtitle = fm.get("subtitle", "")
    blurb    = fm.get("blurb") or subtitle or title
    date     = fm.get("date", "")
    author   = fm.get("author", "Kaushal Choudhary")
    year     = (date[:4] if len(date) >= 4 and date[:4].isdigit() else "2026")
    url      = f"{DOMAIN}/blog/{slug}/"
    is_draft = str(fm.get("draft", "")).strip().lower() in ("true", "yes", "1")
    cover    = fm.get("cover", "")
    img      = (cover if cover.startswith("http") else DOMAIN + cover) if cover else ""
    img_meta = (f'\n  <meta property="og:image" content="{esc(img)}" />'
                f'\n  <meta name="twitter:image" content="{esc(img)}" />') if img else ""

    robots = '\n  <meta name="robots" content="noindex, nofollow" />' if is_draft else ""
    head = f"""<title>{esc(title)} — Kaushal</title>
  <meta name="description" content="{esc(subtitle or title)}" />{robots}
  <link rel="canonical" href="{url}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Kaushal Choudhary" />
  <meta property="og:title" content="{esc(title)}" />
  <meta property="og:description" content="{esc(subtitle or title)}" />
  <meta property="og:url" content="{url}" />
  <meta property="article:author" content="{esc(author)}" />
  <meta property="article:published_time" content="{esc(date)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{esc(title)}" />
  <meta name="twitter:description" content="{esc(subtitle or title)}" />{img_meta}"""

    out_html = re.sub(r"<title>.*?</title>", head, template, count=1, flags=re.DOTALL)
    out_dir = ROOT / "blog" / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "index.html").write_text(out_html)
    print(f"  ✓ blog/{slug}/  →  {title}" + ("  (draft · unlisted)" if is_draft else ""))

    if is_draft:
        continue   # drafts get a page (for preview) but stay off the homepage list

    cards.append(
        f'    <a class="col reveal" href="/blog/{slug}/">\n'
        f'      <span class="cn">{len(cards)+1:02d}</span>\n'
        f'      <div class="cmid"><h4>{esc(title)}</h4><p>{esc(blurb)}</p></div>\n'
        f'      <span class="cr">{year}<br>read ↗</span>\n'
        f'    </a>'
    )

# --- rewrite the homepage Writing list between the markers ---
index_path = ROOT / "index.html"
html = index_path.read_text()
block = "\n".join(cards)
new_html, n = re.subn(
    r"(<!-- POSTS:START.*?-->\n).*?(\n\s*<!-- POSTS:END -->)",
    lambda m: m.group(1) + block + m.group(2),
    html, count=1, flags=re.DOTALL,
)
if n:
    index_path.write_text(new_html)
    print(f"  ✓ index.html Writing list  →  {len(cards)} post(s)")
else:
    print("  ⚠ index.html POSTS markers not found — homepage list unchanged")

print("done.")
PY
