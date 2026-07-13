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

  // ---------- live next-token prediction: a tiny LLM generating (profile art) ----------
  (function () {
    const cv = document.getElementById("llmnet"); if (!cv) return;
    const x = cv.getContext("2d");
    const INK = "#16130d", AC = "#ff5a3c", MUT = "#8a7c5e", NAVY = "24,42,84", DPR = Math.min(2, window.devicePixelRatio || 1);
    const PROMPT = ">";
    // scripted softmax over the next token; [0] is the one that gets sampled
    const STEPS = [
      [["the", .60], ["a", .22], ["we", .11], ["this", .07]],
      [["model", .54], ["system", .22], ["agent", .15], ["network", .09]],
      [["ships", .47], ["runs", .27], ["scales", .17], ["trains", .09]],
      [["to", .71], ["on", .16], ["at", .08], ["for", .05]],
      [["the", .66], ["your", .18], ["an", .10], ["its", .06]],
      [["edge", .51], ["cloud", .29], ["gpu", .13], ["node", .07]],
      [["and", .63], ["then", .20], ["but", .10], ["so", .07]],
      [["stays", .50], ["keeps", .28], ["runs", .15], ["holds", .07]],
      [["alive", .57], ["fast", .25], ["cheap", .11], ["warm", .07]],
    ];
    let W, H;
    function fit() { W = cv.offsetWidth; H = cv.offsetHeight; cv.width = W * DPR; cv.height = H * DPR; x.setTransform(DPR, 0, 0, DPR, 0, 0); }
    fit(); let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(fit, 200); });

    function wrap(str, maxW) {
      const ws = str.split(" "), out = []; let c = "";
      for (const w of ws) { const t = c ? c + " " + w : w; if (x.measureText(t).width > maxW && c) { out.push(c); c = w; } else c = t; }
      if (c) out.push(c); return out;
    }
    function render(clock, text, step, phase) {
      x.clearRect(0, 0, W, H);
      const PAD = 16, splitY = Math.round(H * 0.54);
      x.font = "600 15px 'Space Mono', monospace"; x.textBaseline = "top";
      const lines = wrap((PROMPT + " " + text.join(" ")).trim(), W - 2 * PAD); let yy = PAD;
      x.fillStyle = INK; lines.forEach(l => { x.fillText(l, PAD, yy); yy += 21; });
      if (phase !== "done" && Math.floor(clock * 1.6) % 2 === 0) {
        const lw = x.measureText(lines[lines.length - 1] || "").width;
        x.fillStyle = AC; x.fillRect(PAD + lw + 4, yy - 20, 8, 14);
      }
      x.strokeStyle = "rgba(" + NAVY + ",.2)"; x.lineWidth = 1; x.beginPath(); x.moveTo(PAD, splitY); x.lineTo(W - PAD, splitY); x.stroke();
      x.font = "10px 'Space Mono', monospace"; x.fillStyle = MUT; x.textBaseline = "alphabetic";
      x.fillText("P( next token )", PAD, splitY + 16);
      const cur = STEPS[Math.min(step, STEPS.length - 1)];
      const barX = PAD + 66, barW = W - PAD - barX - 34, top0 = splitY + 28, rowH = Math.min(24, (H - top0 - 6) / cur.length);
      cur.forEach(([tok, p], i) => {
        const cy = top0 + rowH * i + rowH / 2, hot = i === 0 && phase !== "think";
        const shown = phase === "think" ? p * (0.5 + 0.6 * Math.abs(Math.sin(clock * 7 + i * 1.3))) : p;
        x.textBaseline = "middle";
        x.fillStyle = hot ? AC : INK; x.font = (hot ? "700 " : "400 ") + "12px 'Space Mono', monospace";
        x.fillText(tok, PAD, cy);
        x.fillStyle = hot ? AC : "rgba(" + NAVY + ",.3)"; x.fillRect(barX, cy - 5, Math.max(2, barW * Math.min(1, shown)), 10);
        x.fillStyle = MUT; x.font = "10px 'Space Mono', monospace";
        x.fillText(Math.round(shown * 100) + "%", barX + barW + 5, cy);
      });
    }

    let text = [], step = 0, phase = "think", pt = 0, clock = 0;
    const THINK = 1.1, HOLD = 0.55, DONE = 2.2;
    if (reduce.matches) { render(0, ["the", "model", "ships", "to", "the", "edge"], 5, "hold"); return; }
    (function loop() {
      clock += 1 / 60; pt += 1 / 60;
      if (phase === "think" && pt > THINK) { phase = "hold"; pt = 0; }
      else if (phase === "hold" && pt > HOLD) { text.push(STEPS[step][0][0]); step++; pt = 0; phase = step >= STEPS.length ? "done" : "think"; }
      else if (phase === "done" && pt > DONE) { text = []; step = 0; phase = "think"; pt = 0; }
      render(clock, text, step, phase);
      requestAnimationFrame(loop);
    })();
  })();

  // ---------- contact particle field (curl-flow + mouse repel) ----------
  (function () {
    const c = document.getElementById("endField"); if (!c || reduce.matches) return;
    const x = c.getContext("2d"); let W, H, mx = -999, my = -999, ps = [];
    function seed(){ const n = Math.min(900, Math.floor((W*H)/1700)); ps = Array.from({ length: n }, () => ({ x: Math.random()*W, y: Math.random()*H, vx: 0, vy: 0 })); }
    function rs(){ W = c.width = c.offsetWidth; H = c.height = c.offsetHeight; seed(); } rs();
    addEventListener("resize", rs);
    const sec = c.closest("section") || c.parentElement;
    sec.addEventListener("mousemove", e => { const r = c.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    sec.addEventListener("mouseleave", () => { mx = my = -9999; });
    let running = false;
    new IntersectionObserver(es => { const vis = es[0].isIntersecting; if (vis && !running){ running = true; draw(); } else if (!vis) running = false; }, { threshold: 0 }).observe(c);
    function draw(){
      x.fillStyle = "rgba(22,19,13,.18)"; x.fillRect(0, 0, W, H);   // fade trails into the ink panel
      for (const p of ps){
        const a = Math.sin(p.x*.0038) * Math.cos(p.y*.0038) * 6.283;
        p.vx += Math.cos(a)*.06; p.vy += Math.sin(a)*.06;
        const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
        if (d < 150){ p.vx += dx/d*1.7; p.vy += dy/d*1.7; }
        p.vx *= .9; p.vy *= .9; p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        const hot = (Math.abs(p.vx) + Math.abs(p.vy)) > 2.2;
        x.fillStyle = hot ? "rgba(255,90,60,.95)" : "rgba(239,231,214,.5)";
        x.fillRect(p.x, p.y, 1.7, 1.7);
      }
      if (running) requestAnimationFrame(draw);
    }
  })();

  // ---------- easter eggs ----------
  try {
    console.log("%c◆ kc", "color:#ff5a3c;font:700 22px monospace");
    console.log("%cpoking around the source? good instinct.  → github.com/kaushal07wick", "color:#8a7c5e;font:13px monospace");
  } catch (e) {}
  (function () {
    const seq = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
    let i = 0;
    addEventListener("keydown", e => {
      i = (e.key === seq[i]) ? i + 1 : (e.key === seq[0] ? 1 : 0);
      if (i === seq.length){ i = 0; rain(); }
    });
    function rain(){
      if (document.getElementById("__rain")) return;
      const cv = document.createElement("canvas"); cv.id = "__rain";
      cv.style.cssText = "position:fixed;inset:0;z-index:9999;pointer-events:none";
      document.body.appendChild(cv);
      let W, H; const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; }; size();
      const x = cv.getContext("2d"), cols = Math.floor(W/14), y = Array(cols).fill(0), G = "◆01アイウエ<>/#*+kc";
      let t0 = null;
      (function d(t){
        if (t0 === null) t0 = t;
        x.fillStyle = "rgba(22,19,13,.08)"; x.fillRect(0, 0, W, H);
        x.font = "14px monospace";
        for (let i = 0; i < cols; i++){
          x.fillStyle = Math.random() < 0.03 ? "#efe7d6" : "#ff5a3c";
          x.fillText(G[Math.floor(Math.random()*G.length)], i*14, y[i]*14);
          y[i] = (y[i]*14 > H && Math.random() > 0.975) ? 0 : y[i] + 1;
        }
        if (t - t0 < 5200) requestAnimationFrame(d);
        else { cv.style.transition = "opacity .6s"; cv.style.opacity = "0"; setTimeout(() => cv.remove(), 700); }
      })();
    }
  })();

  // ---------- nav gets a solid backdrop once you scroll off the top ----------
  (function () {
    const nav = document.querySelector("nav"); if (!nav) return;
    const onScroll = () => nav.classList.toggle("scrolled", scrollY > 20);
    onScroll(); addEventListener("scroll", onScroll, { passive: true });
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
