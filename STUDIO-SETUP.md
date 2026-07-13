# Studio — going live on kaushalchoudhary.com

The blog CMS ("Studio") can run two ways:

- **Local** — `python3 tools/cms.py`, open `http://127.0.0.1:4321/studio`. Publishing writes files on your machine; you `git push` to deploy.
- **Live** — hosted at `kaushalchoudhary.com/studio`, behind a login. Publishing commits to the repo via a Cloudflare Function; the site rebuilds and the post goes live in ~1 minute.

Same site, same repo. `kaushalchoudhary.com` already serves this repo from Cloudflare Pages, so "live" is just three one-time setup steps.

```
  /studio  ─(login: Cloudflare Access)─►  write + live preview
     │  Publish
     ▼
  /api/publish  ─(Function, GitHub token)─►  commit posts/<slug>.md + index.json
     │
     ▼
  Cloudflare Pages build  ─(runs regen)─►  blog/<slug>/ + homepage card  ─►  live
```

---

## 1. GitHub token (lets the Function commit)

1. GitHub → **Settings → Developer settings → Fine-grained personal access tokens → Generate new token**.
2. **Repository access:** Only select repositories → `kaushal07wick/kaushal07wick.github.io`.
3. **Permissions:** Repository permissions → **Contents: Read and write**. Nothing else.
4. Generate, copy the token (starts `github_pat_…`). You'll paste it in step 2.

## 2. Cloudflare Pages — build + secrets

In the Cloudflare dashboard → **Workers & Pages → your project → Settings**:

**Build & deploy → Build configuration**
- Build command: `bash tools/regen-blog-pages.sh`
- Build output directory: `/`

  (This regenerates the blog pages + homepage from `posts/` on every deploy — so a
  committed `posts/<slug>.md` becomes a real page. Required.)

**Environment variables** (Production) — add:

| Name              | Value                                  | Type   |
| ----------------- | -------------------------------------- | ------ |
| `GITHUB_TOKEN`    | the token from step 1                  | Secret |
| `GITHUB_OWNER`    | `kaushal07wick`                        | Text   |
| `GITHUB_REPO`     | `kaushal07wick.github.io`              | Text   |
| `GITHUB_BRANCH`   | `master`                               | Text   |
| `STUDIO_PASSWORD` | a strong password (this is your login) | Secret |
| `STUDIO_SECRET`   | any long random string (signs sessions)| Secret |

The `functions/` folder deploys automatically as Pages Functions — no config needed.

## 3. The login

**It's built in.** Visiting `kaushalchoudhary.com/studio` shows a password screen; enter
`STUDIO_PASSWORD` and you're in for 12 hours (an HMAC-signed, HttpOnly cookie signed with
`STUDIO_SECRET`). `/api/publish` and `/api/images` reject anything without a valid session, so
the page and its API are useless to anyone without the password. `/studio` is also `noindex`.

That's all you need. **Optional extra hardening:** put Cloudflare Access in front too
(Zero Trust → Access → add app for `kaushalchoudhary.com/studio*` and `/api*`, allow only your
email). Then it's password **and** your Google/GitHub identity. Not required — the built-in
login is already real, server-verified auth.

---

## Using it

Go to `https://kaushalchoudhary.com/studio` → sign in → write, watch the live preview,
hit **Publish**. The card shows "committed ✓ — live in ~1 min". Reload the post URL shortly after.

- **New post:** the "＋ New post" option (default). Fill title/subtitle/blurb, write Markdown.
- **Edit a post:** pick it from the dropdown, change, Publish (same slug overwrites).
- **Images/video:** the 🖼 button lists everything in `/images`. To add new media, drop files
  in `images/` and push (image upload from the browser isn't wired yet — ask if you want it).

## Security notes

- `GITHUB_TOKEN`, `STUDIO_PASSWORD`, `STUDIO_SECRET` live only as Cloudflare **secrets** — never in the browser or the repo.
- `/api/publish` + `/api/images` verify the session cookie server-side; no session → 401. The password is never stored client-side.
- The GitHub token is scoped to one repo, Contents-only — worst case it can edit this repo, nothing else.
- Use a strong `STUDIO_PASSWORD`. Want 2FA / no shared password? Add Cloudflare Access on top (step 3).

## Local development

`python3 tools/cms.py` → `http://127.0.0.1:4321/studio`. Publishing writes files locally and runs
`regen`; then `git push`. No token or Access needed locally.
