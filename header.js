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
  function syncTheme() {
    const saved = localStorage.getItem("theme");
    const isLight = saved === "light";

    document.body.classList.toggle("light", isLight);
    toggle.textContent = isLight ? "☀︎" : "☾";
  }
  syncTheme();

  toggle?.addEventListener("click", () => {
    const newLight = document.body.classList.toggle("light");
    localStorage.setItem("theme", newLight ? "light" : "dark");
    toggle.textContent = newLight ? "☀︎" : "☾";
  });
}

document.addEventListener("DOMContentLoaded", loadHeader);
