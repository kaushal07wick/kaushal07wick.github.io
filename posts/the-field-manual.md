title: The Field Manual
subtitle: Every block this journal knows how to set in type — a living specimen
blurb: A living specimen of every block the blog can print.
author: Kaushal Choudhary
date: 2026-07-13
# The Field Manual

![A specimen sheet — every block this journal can print, set once.](/images/cctv-hero.webp)

This page is a **type specimen**: a single post that exercises every block the journal knows how to print, so the next real piece of writing has nothing left to guess about. If it renders cleanly here, it renders cleanly anywhere. Scroll it end to end, or jump straight to a section below.

## Contents

1. [Typography & Emphasis](#typography-emphasis)
2. [Lists, Ordered & Not](#lists-ordered-not)
3. [Pull Quotes](#pull-quotes)
4. [Code, Any Language](#code-any-language)
5. [Callouts](#callouts)
6. [Tables](#tables)
7. [Images](#images)
8. [Video & Motion](#video-motion)
9. [Links That Preview](#links-that-preview)
10. [The End](#the-end)

## Typography & Emphasis

Body copy is set in Bricolage Grotesque at a comfortable measure. You get **bold for weight**, *italic for aside*, and `inline code` for the literal — a function name like `sparse_categorical_crossentropy`, a flag like `--headless`, a path like `/etc/hosts`. Links come in two flavors: an [external link to GitHub](https://github.com/kaushal07wick) that opens in a new tab, carries a ↗, and previews on hover — and internal jumps like [back to the contents](#contents) that scroll you around the page instead of leaving it.

The first paragraph of any post gets a drop cap, because a magazine should open like one.

### A third-level heading

Sits quietly under its section — no rule, no ornament, just weight.

#### And a fourth, set in mono

For when you're labeling steps or naming a small thing.

## Lists, Ordered & Not

Unordered lists trade the bullet for a vermilion dash:

- Static parsers are fast, but miss anything rendered after load
- Browser automation sees everything and pays for it in CPU
- The right tool depends on what you are actually scraping

Ordered lists keep their numbers, set in mono and tinted:

1. Scope the diff — only behavior-relevant changes
2. Build the candidate — file, symbol, risk level
3. Run the suite — deterministically, in a sandbox
4. Heal what fails — feeding the failure back as context

## Pull Quotes

When a line earns the right to stand outside the flow, a blockquote pulls it into serif italic:

> The best code is the code you never had to write; the second best is the code that tells you the moment it breaks.

## Code, Any Language

Code blocks are warm, not dark — a paper card with an ink frame, a language tag in the corner, and a copy button. Python:

```python
def heal(candidate: TestCandidate) -> Patch:
    ctx = FullContextSnapshot.build(candidate.file)   # parse + map symbols
    for attempt in range(MAX_RETRIES):
        patch = agent.propose(candidate, ctx)
        if sandbox.run(patch).passed:
            return patch                # only ships if the suite is green
    raise HealFailed(candidate.symbol)
```

Shell, for the copy-paste crowd:

```bash
# stage a change, then let the agent verify it end to end
git add -p
agent run --all --reload
```

And JavaScript, because the front-end deserves the same treatment:

```javascript
const slugify = s =>
  s.trim().toLowerCase()
   .replace(/[^\w\s-]/g, "")
   .replace(/[\s_]+/g, "-");
```

## Callouts

Anything worth lifting out of the body goes in a callout — a tinted box with a vermilion spine. It is just an `<aside>` in the Markdown, and links inside it style themselves:

<aside>

🔥 **Tip.** Keep callouts short. Use them for the one thing a reader must not miss — a gotcha, a shortcut, a link worth clicking like [osmogrep.com](https://osmogrep.com).

</aside>

## Tables

Tables scroll horizontally on small screens instead of breaking the column, and the header sits in reversed ink:

| Method | Sees JS content | Speed | Scales |
| --- | --- | --- | --- |
| BeautifulSoup | No | Fast | Poorly |
| Selenium | Yes | Slow | Painfully |
| Firecrawl | Yes | Fast | Cleanly |

## Images

Every image is framed with a one-pixel ink border and a hard print-offset shadow, and its alt text becomes the caption printed underneath:

![System diagrams render as framed figures — this line is the alt text, printed as a caption.](/images/osmo-arch.svg)

## Video & Motion

Drop an `.mp4` — or a `.webm`, or a GIF — using the exact same `![]()` image syntax, and it becomes a silent, looping, autoplaying clip, framed like any other figure:

![A short clip loops silently and autoplays, framed like any figure.](/images/osmogrep.mp4)

## Links That Preview

Hover any external link and a small card fades in with a live screenshot of the destination and its domain — so a reader knows where a link goes before they take it. Try these:

- [OsmoGrep on GitHub](https://github.com/kaushal07wick/OsmoGrep)
- [The Firecrawl documentation](https://docs.firecrawl.dev)
- [Anthropic](https://www.anthropic.com)

---

## The End

If you made it here and every block above looked right, the journal is ready for the next real story. Write it in the Studio, hit publish, and it ships with all of this for free.
