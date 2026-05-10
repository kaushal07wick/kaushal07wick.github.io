#!/usr/bin/env bash
# Regenerate /blog/<slug>/index.html for every post listed in posts/index.json,
# baking the post's title + subtitle into <title>, <meta description>,
# Open Graph, and Twitter Card tags so link previews on Twitter / LinkedIn /
# Slack / iMessage show the post title instead of "Blog Post — Kaushal".
#
# Run:    bash tools/regen-blog-pages.sh
# Re-run any time you add/edit a post or modify blog-post.html.

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
DOMAIN = "https://www.thekaushal.xyz"

def parse_frontmatter(md: str) -> dict:
    out = {}
    for line in md.splitlines():
        m = re.match(r"^(title|subtitle|author|date)\s*:\s*(.+)$", line, re.IGNORECASE)
        if m:
            out[m.group(1).lower()] = m.group(2).strip()
        elif line.lstrip().startswith("# "):
            break
    return out

def esc(s: str) -> str:
    return (s.replace("&", "&amp;")
             .replace("<", "&lt;")
             .replace(">", "&gt;")
             .replace('"', "&quot;"))

template = (ROOT / "blog-post.html").read_text()
files    = json.loads((ROOT / "posts" / "index.json").read_text())

print("regenerating per-post pages with social meta tags:")
for fname in files:
    slug = re.sub(r"\.md$", "", fname)
    md_path = ROOT / "posts" / fname
    if not md_path.exists():
        print(f"  ⚠ skipped (missing): posts/{fname}")
        continue

    md = md_path.read_text()
    fm = parse_frontmatter(md)
    title    = fm.get("title", slug)
    subtitle = fm.get("subtitle", "")
    date     = fm.get("date", "")
    author   = fm.get("author", "Kaushal Choudhary")
    url      = f"{DOMAIN}/blog/{slug}/"

    head = f"""<title>{esc(title)} — Kaushal</title>
  <meta name="description" content="{esc(subtitle or title)}" />
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
  <meta name="twitter:description" content="{esc(subtitle or title)}" />"""

    # replace the <title>...</title> in the template
    out_html = re.sub(r"<title>.*?</title>", head, template, count=1, flags=re.DOTALL)

    out_dir = ROOT / "blog" / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "index.html").write_text(out_html)
    print(f"  ✓ blog/{slug}/  →  {title}")

print("done.")
PY
