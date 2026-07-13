/* site-fx — shared motion layer. Safe to load on any page.
   - scroll reveal for .reveal / .fx-rise         (window.fxObserve)
   - link hover preview for a[data-preview]        (window.fxPreview)
   - custom trailing cursor (fine pointers only) */
(function () {
  const fine   = window.matchMedia("(hover:hover) and (pointer:fine)");
  const reduce = window.matchMedia("(prefers-reduced-motion:reduce)");

  // ---------- scroll reveal ----------
  const obs = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  window.fxObserve = function (root) {
    (root || document).querySelectorAll(".reveal:not(.in), .fx-rise:not(.in)").forEach((el) => obs.observe(el));
  };
  window.fxObserve();

  // ---------- link hover preview (runtime screenshot, edge-cached via /api/shot) ----------
  (function () {
    let card = document.getElementById("linkcard");
    if (!card) { card = document.createElement("div"); card.id = "linkcard"; document.body.appendChild(card); }
    const LOCAL = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);
    const shotUrl = (u) => `${LOCAL ? "/cms/shot" : "/api/shot"}?url=${encodeURIComponent(u)}`;
    const loaded = new Set();               // urls whose screenshot is in cache → instant
    let openT, hideT;
    card.addEventListener("mouseenter", () => clearTimeout(hideT));
    card.addEventListener("mouseleave", () => card.classList.remove("show"));

    function render(a, url) {
      let host = ""; try { host = new URL(url, location.href).hostname.replace(/^www\./, ""); } catch (e) {}
      const src = shotUrl(url), done = loaded.has(url);
      card.innerHTML =
        `<span class="lc-img${done ? "" : " loading"}"${done ? ` style="background-image:url('${src}')"` : ""}></span>` +
        `<div class="lc-meta"><img class="lc-fav" src="https://www.google.com/s2/favicons?domain=${host}&sz=64" alt="">` +
        `<span class="lc-dom">${host || "link"}</span></div>`;
      if (!done) {
        const img = card.querySelector(".lc-img");
        const pre = new Image();
        pre.onload = () => { loaded.add(url); img.classList.remove("loading"); img.classList.add("fadein"); img.style.backgroundImage = `url('${src}')`; };
        pre.onerror = () => img.classList.remove("loading");   // favicon + domain remain
        pre.src = src;
      }
      const r = a.getBoundingClientRect(), W = 300, CH = 210, gap = 10;
      const left = Math.max(scrollX + 12, Math.min(scrollX + r.left, scrollX + document.documentElement.clientWidth - W - 12));
      const top  = (r.top > CH + 20) ? scrollY + r.top - CH - gap : scrollY + r.bottom + gap;
      card.style.left = left + "px"; card.style.top = top + "px";
      card.classList.add("show");
    }
    function attach(a) {
      if (a.__fxPrev) return; a.__fxPrev = true;
      const url = a.getAttribute("href"); if (!url) return;
      a.addEventListener("mouseenter", () => { clearTimeout(hideT); openT = setTimeout(() => render(a, url), 80); });
      a.addEventListener("mouseleave", () => { clearTimeout(openT); hideT = setTimeout(() => card.classList.remove("show"), 150); });
    }
    function isExternal(a) {                  // any link that leaves this site
      const href = a.getAttribute("href") || "";
      if (!/^https?:\/\//i.test(href)) return false;   // skip #anchors, /internal, mailto:
      try { return new URL(href, location.href).host !== location.host; } catch (e) { return false; }
    }
    const targets = (root) => [...(root || document).querySelectorAll("a[href]")]
      .filter(a => a.hasAttribute("data-preview") || isExternal(a));

    function prewarm(list) {                  // warm cache so first hovers are instant; cap so we don't hammer the shot API
      list.slice(0, 12).forEach(a => {
        const u = a.getAttribute("href");
        if (u && !loaded.has(u)) { const im = new Image(); im.onload = () => loaded.add(u); im.src = shotUrl(u); }
      });
    }
    window.fxPreview = function (root) {
      const list = targets(root);
      list.forEach(attach);
      const warm = () => prewarm(list);
      if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 3000 }); else setTimeout(warm, 1200);
    };
    window.fxPreview();
  })();

  if (!fine.matches || reduce.matches) return;   // cursor only on fine pointers

  // ---------- custom cursor ----------
  const root = document.documentElement;
  root.classList.add("fx-on");
  const dot  = document.createElement("div"); dot.className  = "fx-dot";
  const ring = document.createElement("div"); ring.className = "fx-ring";
  document.body.append(ring, dot);

  let mx = innerWidth / 2, my = innerHeight / 2;
  let dx = mx, dy = my, rx = mx, ry = my;

  addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; root.classList.remove("fx-hidden"); }, { passive: true });
  document.addEventListener("mouseleave", () => root.classList.add("fx-hidden"));
  document.addEventListener("mouseenter", () => root.classList.remove("fx-hidden"));
  addEventListener("mousedown", () => root.classList.add("fx-down"));
  addEventListener("mouseup",   () => root.classList.remove("fx-down"));
  addEventListener("blur",      () => root.classList.add("fx-hidden"));

  const HOVER = "a,button,select,summary,.os-item,.prow,.col,.role,.erow,.cap,.tool,.btn,.copy-btn,[data-cursor]";
  const TEXT  = "input,textarea,[contenteditable=''],[contenteditable=true]";
  document.addEventListener("mouseover", (e) => {
    root.classList.toggle("fx-hover", !!(e.target.closest && e.target.closest(HOVER)));
    root.classList.toggle("fx-text",  !!(e.target.closest && e.target.closest(TEXT)));
  });

  (function loop() {
    dx += (mx - dx) * 0.38; dy += (my - dy) * 0.38;   // dot: snappy
    rx += (mx - rx) * 0.17; ry += (my - ry) * 0.17;   // ring: trails
    dot.style.transform  = `translate(${dx}px,${dy}px)`;
    ring.style.transform = `translate(${rx}px,${ry}px)`;
    requestAnimationFrame(loop);
  })();
})();
