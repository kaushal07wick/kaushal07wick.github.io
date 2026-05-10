async function loadHeader() {
  const container = document.getElementById("header-container");
  if (!container) return;
  const html = await fetch("header.html").then(r => r.text());
  container.innerHTML = html;
  
  // Mobile menu toggle
  const menuBtn = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");
  if (menuBtn) {
    menuBtn.onclick = () => mobileMenu.classList.toggle("hidden");
  }
  
  // Theme toggle sync
  const toggle = document.getElementById("theme-toggle");
  const mobileToggle = document.getElementById("mobile-theme-toggle");
  
  function syncTheme() {
    const saved = localStorage.getItem("theme");
    const isLight = saved === "light";
    document.body.classList.toggle("light", isLight);
    const icon = isLight ? "☀︎" : "☾";
    if (toggle) toggle.textContent = icon;
    if (mobileToggle) mobileToggle.textContent = icon;
  }
  
  function handleThemeToggle() {
    const newLight = document.body.classList.toggle("light");
    localStorage.setItem("theme", newLight ? "light" : "dark");
    const icon = newLight ? "☀︎" : "☾";
    if (toggle) toggle.textContent = icon;
    if (mobileToggle) mobileToggle.textContent = icon;
  }
  
  syncTheme();

  toggle?.addEventListener("click", handleThemeToggle);
  mobileToggle?.addEventListener("click", handleThemeToggle);

  // ── status bar ──────────────────────────────────────
  const pageEl  = document.getElementById("sl-page");
  const clockEl = document.getElementById("sl-clock");
  if (pageEl) {
    const file = (location.pathname.split("/").pop() || "index.html")
      .replace(/\.html$/, "")
      .replace(/^$/, "index");
    pageEl.textContent = file || "index";
  }
  if (clockEl) {
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const d = new Date();
      const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const hms = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      clockEl.textContent = `${ymd} ${hms}`;
    };
    tick();
    setInterval(tick, 1000);
  }
  // reserve room for the fixed status bar
  document.body.style.paddingBottom = "32px";

  // ── scroll-reveal with stagger ──────────────────────
  setupScrollReveal();

  // ── visitor counter ─────────────────────────────────
  trackVisit();
}

// Free no-signup hit counter. Reads/increments at most once per browser per day.
// Public read-only URL (anyone can curl):
//   https://abacus.jasoncameron.dev/get/kaushal07wick-github-io/visits
async function trackVisit() {
  const NS  = "kaushal07wick-github-io";
  const KEY = "visits";
  const today = new Date().toISOString().slice(0, 10);
  const stamp = `visit-counted-${today}`;

  let endpoint;
  try {
    if (!localStorage.getItem(stamp)) {
      localStorage.setItem(stamp, "1");
      endpoint = `https://abacus.jasoncameron.dev/hit/${NS}/${KEY}`;
    } else {
      endpoint = `https://abacus.jasoncameron.dev/get/${NS}/${KEY}`;
    }
    const r = await fetch(endpoint);
    if (!r.ok) return;
    const d = await r.json();
    const value = d.value ?? d.count ?? null;
    if (value == null) return;
    document.querySelectorAll("[data-visit-count]").forEach(el => {
      el.textContent = value.toLocaleString();
    });
  } catch {
    // graceful no-op if the counter service is unreachable
  }
}

function setupScrollReveal() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  const selector = [
    "section",
    ".tech-card",
    ".work-card",
    ".tl-item",
    ".uses-card",
    ".dispatch-card",
    ".stat",
    ".about-card",
    "footer.site-footer",
  ].join(",");

  const targets = Array.from(document.querySelectorAll(selector));
  if (!targets.length) return;

  // Mark up-front to avoid flash
  targets.forEach(el => el.classList.add("reveal-init"));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      // stagger only among siblings of the same parent that are also reveal-init
      const parent = el.parentElement;
      const siblings = parent
        ? Array.from(parent.children).filter(c => c.classList.contains("reveal-init"))
        : [el];
      const idx = siblings.indexOf(el);
      const delayMs = Math.min(idx, 8) * 60;
      el.style.transitionDelay = delayMs + "ms";
      el.classList.remove("reveal-init");
      el.classList.add("reveal-in");
      io.unobserve(el);
    });
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -40px 0px",
  });

  targets.forEach(el => io.observe(el));
}

document.addEventListener("DOMContentLoaded", loadHeader);