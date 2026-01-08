/* ========== PARALLAX BACKGROUND ========== */
document.addEventListener("mousemove", (e) => {
  const layer = document.getElementById("parallax-layer");
  const x = (e.clientX / window.innerWidth - 0.5) * 20;
  const y = (e.clientY / window.innerHeight - 0.5) * 20;
  layer.style.transform = `translate(${x}px, ${y}px)`;
});

/* ========== THEME TOGGLE ========== */
document.addEventListener("DOMContentLoaded", () => {
      function initThemeToggle() {
        const toggle = document.getElementById("theme-toggle");
        if (!toggle) return setTimeout(initThemeToggle, 50);

        function applyTheme() {
          const saved = localStorage.getItem("theme") || "dark";
          const isLight = saved === "light";
          document.body.classList.toggle("light", isLight);
          toggle.textContent = isLight ? "☀︎" : "☾";
        }

        applyTheme();

        toggle.addEventListener("click", () => {
          const isLight = document.body.classList.toggle("light");
          localStorage.setItem("theme", isLight ? "light" : "dark");
          toggle.textContent = isLight ? "☀︎" : "☾";
        });
      }

      initThemeToggle();
});
/* ============================================================
   PEGASUS SHELL v2.1 — KaushalOS Interactive Terminal Kernel
============================================================ */

const panel  = document.getElementById("terminal-wrapper");
const output = document.getElementById("console-output");
const input  = document.getElementById("console-input");

let history = [];
let historyIndex = -1;

let blogsIndex = [];
let projectsIndex = [];
let currentPath = "/";
let vfsReady = false;

/* ============================================================
   BOOT SEQUENCE (prints once)
============================================================ */

function bootScreen() {
  print(`
██████╗ ███████╗ ██████╗  █████╗ ███████╗██╗   ██╗███████╗
██╔══██╗██╔════╝██╔════╝ ██╔══██╗██╔════╝██║   ██║██╔════╝
██████╔╝█████╗  ██║  ███╗███████║███████╗██║   ██║███████╗
██╔═══╝ ██╔══╝  ██║   ██║██╔══██║╚════██║██║   ██║╚════██║
██║     ███████╗╚██████╔╝██║  ██║███████║╚██████╔╝███████║
╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝
Pegasus Terminal v2.1
For terminal lovers and geeks, Type 'help' to begin.
`);
}
bootScreen();

/* ============================================================
   PRINT HELPERS
============================================================ */

function print(text) {
  output.innerHTML += text + "\n";
  output.scrollTop = output.scrollHeight;
}

function warn(msg) {
  print(`⚠ ${msg}`);
}

function error(msg) {
  print(`❌ ${msg}`);
}

/* ============================================================
   FOCUS CONTROL
============================================================ */

panel.addEventListener("click", () => input.focus());
document.addEventListener("keydown", e => { if (e.key === "~") input.focus(); });

/* ============================================================
   VFS STRUCTURE
============================================================ */

let vfs = {
  "/": {
    type: "dir",
    children: {
      "projects": { type: "dir", children: {} },
      "posts":    { type: "dir", children: {} },
      "readme.txt": { type: "file", content: "KaushalOS virtual shell core" }
    }
  }
};

/* ============================================================
   LOAD DYNAMIC INDEXES (BLOGS + PROJECTS)
============================================================ */

async function loadDynamicData() {
  try {
    blogsIndex = await fetch("posts/index.json").then(r => r.json());
    projectsIndex = await fetch("projects/index.json").then(r => r.json());

    blogsIndex.forEach(f => {
      vfs["/"].children["posts"].children[f.toLowerCase()] = {
        type: "file",
        filename: f
      };
    });

    projectsIndex.forEach(p => {
      vfs["/"].children["projects"].children[p.name.toLowerCase()] = {
        type: "file",
        name: p.name,
        repo: p.repo,
        desc: p.desc || "No description available."
      };
    });

    vfsReady = true;
  } catch (err) {
    error("Failed to load dynamic indexes");
  }
}
loadDynamicData();

/* ============================================================
   DIRECTORY RESOLUTION
============================================================ */

function getDir(path) {
  const parts = path.split("/").filter(Boolean);
  let node = vfs["/"];
  for (let p of parts) {
    if (!node.children[p]) return null;
    node = node.children[p];
  }
  return node;
}

/* ============================================================
   COMMANDS
============================================================ */

const commands = {

  help() {
    print(`
Available commands:
  ls                      List directory
  cd <dir>                Change directory
  cat <file>              File metadata
  posts                   List blog posts
  projects                List projects
  open <target>           Open blog/project page
  info <project>          Show project details
  clear                   Clear screen
`);
  },

  ls() {
    if (!vfsReady) return warn("Filesystem loading…");
    print(Object.keys(getDir(currentPath).children).join("   "));
  },

  cd(dir) {
    if (!vfsReady) return warn("Filesystem loading…");

    if (dir === "/" || dir === undefined) return currentPath = "/";
    if (dir === "..") {
      let p = currentPath.split("/").filter(Boolean);
      p.pop();
      currentPath = p.length ? "/" + p.join("/") : "/";
      return;
    }

    const d = getDir(currentPath);
    if (d.children[dir] && d.children[dir].type === "dir") {
      currentPath += (currentPath === "/" ? "" : "/") + dir;
    } else error("Directory not found.");
  },

  cat(file) {
    if (!vfsReady) return warn("Filesystem loading…");
    if (!file) return warn("Specify file");

    const node = getDir(currentPath).children[file.toLowerCase()];
    if (!node) return error("File not found");

    print(node.real ? "Markdown file — use: open " + node.filename : node.content);
  },

  open(target) {
    if (!target) return warn("Specify what to open");
    if (!vfsReady) return warn("Filesystem loading…");

    const t = target.toLowerCase();

    if (t === "posts") {
      window.location.href = "blog.html";
      return print("→ Opening blog.html");
    }

    if (t === "projects") {
      window.location.href = "projects.html";
      return print("→ Opening projects.html");
    }

    let fname = t.endsWith(".md") ? t : t + ".md";
    if (blogsIndex.includes(fname)) {
      window.location.href = `blog-post.html?file=${fname}`;
      return print("→ Opening blog article: " + fname);
    }

    const proj = projectsIndex.find(p => p.name.toLowerCase() === t);
    if (proj) {
      window.open(proj.repo, "_blank");
      return print("→ Opening GitHub repo: " + proj.repo);
    }

    error("Nothing found to open.");
  },

  posts() {
    if (!vfsReady) return warn("Loading…");
    print("Blog Posts:");
    blogsIndex.forEach(f => print("  • " + f));
  },

  projects() {
    if (!vfsReady) return warn("Loading…");
    print("Projects:");
    projectsIndex.forEach(p => print("  • " + p.name));
  },

  info(name) {
    if (!name) return warn("Usage: info <project>");

    const p = vfs["/"].children["projects"].children[name.toLowerCase()];
    if (!p) return error("Project not found.");

    print(`
[ ${p.name} ]
Repo: ${p.repo}
Info: ${p.desc}
`);
  },

  clear() {
    output.innerHTML = "";
  }
};

/* ============================================================
   EXECUTION HANDLER
============================================================ */

function runCommand(text) {
  if (!text.trim()) return;
  print("\n$ " + text);

  history.push(text);
  historyIndex = history.length;

  const parts = text.split(" ");
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (commands[cmd]) return commands[cmd](...args);
  error("Unknown command. Try 'help'");
}

input.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    runCommand(input.value);
    input.value = "";
  }
});

/* ============================================================
   HISTORY
============================================================ */

input.addEventListener("keydown", e => {
  if (e.key === "ArrowUp") {
    if (historyIndex > 0) historyIndex--;
    input.value = history[historyIndex] || "";
  }
  if (e.key === "ArrowDown") {
    if (historyIndex < history.length - 1) historyIndex++;
    input.value = history[historyIndex] || "";
  }
});
/* ============================================================
   FIXED TAB AUTOCOMPLETE (captures tab before browser focus)
============================================================ */
input.addEventListener("keydown", function(e) {
  if (e.key !== "Tab") return;

  e.preventDefault();      
  e.stopImmediatePropagation(); 

  const val = input.value.trim();
  if (!val) return;

  const parts = val.split(" ");
  const cmd = parts[0].toLowerCase();
  const arg = parts[1]?.toLowerCase() || "";

  const cmdList = Object.keys(commands);
  const fileList = [
    ...blogsIndex.map(f => f.toLowerCase()),
    ...projectsIndex.map(p => p.name.toLowerCase())
  ];

  // COMMAND AUTOCOMPLETE
  if (parts.length === 1) {
    const hits = cmdList.filter(c => c.startsWith(cmd));

    if (hits.length === 1) {
      input.value = hits[0] + " ";
    } else if (hits.length > 1) {
      print(hits.join("   "));
    }
    return;
  }

  // FILE / PROJECT AUTOCOMPLETE
  if (cmd === "open" || cmd === "info" || cmd === "cat") {
    const hits = fileList.filter(f => f.startsWith(arg));

    if (hits.length === 1) {
      input.value = cmd + " " + hits[0];
    } else if (hits.length > 1) {
      print(hits.join("   "));
    }
  }
});


/* ========== SOUND EFFECTS ========== */
const clickSound = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3");
const hoverSound = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-interface-click-1126.mp3");

document.querySelectorAll(".sound-hover").forEach((el) => {
  el.addEventListener("mouseenter", () => {
    hoverSound.currentTime = 0;
    hoverSound.play();
  });

  el.addEventListener("click", () => {
    clickSound.currentTime = 0;
    clickSound.play();
  });
});

/* ========== MOBILE MENU ========== */
document.getElementById("mobile-menu-button").addEventListener("click", () => {
  document.getElementById("mobile-menu").classList.toggle("hidden");
});

/* ========== PLUTONIUM ATOM RENDERING ========== */

const puCanvas = document.getElementById("plutonium-atom");
const ctx = puCanvas.getContext("2d");

puCanvas.width = 400;
puCanvas.height = 400;

let t = 0;
let mouseX = 0;
let mouseY = 0;

const shells = [
  { r: 45, speed: 0.04, count: 2, tiltY: 0.5 },
  { r: 65, speed: 0.03, count: 4, tiltY: 0.8 },
  { r: 85, speed: 0.025, count: 6, tiltY: -0.3 },
  { r: 105, speed: 0.02, count: 8, tiltY: -0.9 },
  { r: 125, speed: 0.015, count: 6, tiltY: 0.2 },
  { r: 145, speed: 0.012, count: 4, tiltY: 0.4 },
  { r: 165, speed: 0.01, count: 2, tiltY: -0.6 },
];

function drawPlutonium() {
  const cx = puCanvas.width / 2;
  const cy = puCanvas.height / 2;

  ctx.clearRect(0, 0, puCanvas.width, puCanvas.height);

  const nucleus = ctx.createRadialGradient(cx, cy, 0, cx, cy, 35);
  nucleus.addColorStop(0, "#ff4d4d");
  nucleus.addColorStop(0.4, "#b30000");
  nucleus.addColorStop(1, "transparent");

  ctx.fillStyle = nucleus;
  ctx.beginPath();
  ctx.arc(cx, cy, 35, 0, Math.PI * 2);
  ctx.fill();

  shells.forEach((shell) => {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0, 255, 200, 0.15)";
    ctx.lineWidth = 1;
    ctx.ellipse(cx, cy, shell.r, shell.r * 0.4, shell.tiltY, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < shell.count; i++) {
      const angle = t * shell.speed + (i * Math.PI * 2) / shell.count;
      const x = cx + shell.r * Math.cos(angle);
      const y = cy + (shell.r * 0.4) * Math.sin(angle);

      drawElectron(x, y);
    }
  });

  t += 1;
  requestAnimationFrame(drawPlutonium);
}

function drawElectron(x, y) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 8);
  glow.addColorStop(0, "rgba(0, 255, 255, 1)");
  glow.addColorStop(1, "transparent");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

window.addEventListener("mousemove", (e) => {
  const rect = puCanvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left - rect.width / 2;
  mouseY = e.clientY - rect.top - rect.height / 2;
});

drawPlutonium();
