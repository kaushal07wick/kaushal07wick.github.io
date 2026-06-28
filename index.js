/* ========== PARALLAX BACKGROUND ========== */
document.addEventListener("mousemove", (e) => {
  const layer = document.getElementById("parallax-layer");
  const x = (e.clientX / window.innerWidth - 0.5) * 20;
  const y = (e.clientY / window.innerHeight - 0.5) * 20;
  layer.style.transform = `translate(${x}px, ${y}px)`;
});
/* ========== MOBILE MENU TOGGLE (missing in index page) ========== */
document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
    });
  }
});
/* ========== THEME TOGGLE (desktop + mobile) ========== */
document.addEventListener("DOMContentLoaded", () => {
  const desktopToggle = document.getElementById("theme-toggle");
  const mobileToggle = document.getElementById("mobile-theme-toggle");
  const mobileIcon = document.getElementById("mobile-theme-icon");

  function setIcons(isLight) {
    const icon = isLight ? "☀︎" : "☾";

    if (desktopToggle) desktopToggle.textContent = icon;
    if (mobileToggle) mobileToggle.textContent = icon;

    if (mobileIcon) {
      mobileIcon.innerHTML = isLight
        ? `<circle cx="12" cy="12" r="5" fill="var(--accent)" />`
        : `<path d="M12 3a9 9 0 1 0 9 9 6 6 0 0 1-9-9z" fill="var(--accent)" />`;
    }
  }

  function syncTheme() {
    const saved = localStorage.getItem("theme") || "light";
    const isLight = saved === "light";
    document.documentElement.classList.toggle("light", isLight);
    setIcons(isLight);
  }

  function toggleTheme() {
    const isLight = document.documentElement.classList.toggle("light");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    setIcons(isLight);
  }

  syncTheme();

  desktopToggle?.addEventListener("click", toggleTheme);
  mobileToggle?.addEventListener("click", toggleTheme);
});
