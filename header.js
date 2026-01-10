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
}

document.addEventListener("DOMContentLoaded", loadHeader);