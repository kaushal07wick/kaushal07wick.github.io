#!/bin/bash
# Regenerates per-post pages at /blog/<slug>/index.html for every post in
# posts/index.json. Run this whenever you add a new post or change the
# blog-post.html template.
#
# Usage:  bash tools/regen-blog-pages.sh

set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required. install with: brew install jq" >&2
  exit 1
fi

slugs=$(jq -r '.[]' posts/index.json | sed 's/\.md$//')

echo "regenerating /blog/<slug>/index.html for:"
for slug in $slugs; do
  mkdir -p "blog/$slug"
  cp blog-post.html "blog/$slug/index.html"
  echo "  ✓ blog/$slug/index.html"
done

echo "done."
