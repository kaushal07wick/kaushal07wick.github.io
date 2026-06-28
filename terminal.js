document.addEventListener("DOMContentLoaded", () => {

  const panel  = document.getElementById("terminal-wrapper")
  const output = document.getElementById("console-output")
  const input  = document.getElementById("console-input")

  function asciiScale() {
    const ascii = document.querySelector(".ascii");
    if (!ascii) return;

    const maxW = panel.clientWidth;
    const baseCols = 80;   // your ASCII is roughly 80 chars wide
    const colWidth = maxW / baseCols;

    let fontSize = colWidth * 1.75; // tuned ratio

    if (fontSize < 8) fontSize = 8;
    if (fontSize > 28) fontSize = 28;

    ascii.style.fontSize = fontSize + "px";
    ascii.style.lineHeight = (fontSize * 1.05) + "px";
    }

  window.addEventListener("resize", asciiScale)

  function print(t) {
    output.innerHTML += t + "\n"
    output.scrollTop = output.scrollHeight
  }

  // colorized helpers — wrap text in span classes defined in index.html
  const c = (t, cls) => `<span class="${cls}">${t}</span>`
  function warn(t)  { print(c("⚠ " + t, "t-warn")) }
  function error(t) { print(c("✖ " + t, "t-err"))  }
  function ok(t)    { print(c("✓ " + t, "t-ok"))   }
  function dim(t)   { print(c(t, "t-dim")) }
  function key(t)   { return c(t, "t-key") }
  function acc(t)   { return c(t, "t-cmd") }

  // command counter (mirrored to header chip in index.html)
  let cmdCount = 0
  function bumpCount() {
    cmdCount++
    const el = document.getElementById("pterm-cmd-count")
    if (el) el.textContent = cmdCount
  }

  function updatePromptPath() {
    const el = document.getElementById("pterm-prompt-path")
    const seg = document.getElementById("pterm-path-seg")
    const display = currentPath === "/" ? "~" : "~" + currentPath
    if (el)  el.textContent = display
    if (seg) seg.textContent = currentPath === "/" ? "root" : currentPath.replace(/^\//, "")
  }

  function bootScreen() {
    const t = new Date().toTimeString().slice(0, 8)
    print(`
<span class="ascii">
██████╗ ███████╗ ██████╗  █████╗ ███████╗██╗   ██╗███████╗
██╔══██╗██╔════╝██╔════╝ ██╔══██╗██╔════╝██║   ██║██╔════╝
██████╔╝█████╗  ██║  ███╗███████║███████╗██║   ██║███████╗
██╔═══╝ ██╔══╝  ██║   ██║██╔══██║╚════██║██║   ██║╚════██║
██║     ███████╗╚██████╔╝██║  ██║███████║╚██████╔╝███████║
╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝
</span>
${c("┌─ Pegasus Terminal", "t-cmd")} ${c("v2.2", "t-pill")} ${c("·", "t-dim")} ${c("session opened " + t, "t-dim")}
${c("├─ kernel", "t-dim")}  pegasus-web 2.2.0 · javascript engine
${c("├─ shell", "t-dim")}   pegasus.zsh · ${c(Object.keys(commands).length + " commands", "t-cmd")}
${c("└─ tip", "t-dim")}     type ${acc("'help'")} for full list · ${acc("'neofetch'")} for system info · ${acc("'tree'")} for files
`)
    asciiScale()
  }

  let history = []
  let historyIndex = -1
  let blogsIndex = []
  let projectsIndex = []
  let vfsReady = false
  let currentPath = "/"

  let vfs = {
    "/": {
      type: "dir",
      children: {
        "projects": { type: "dir", children: {} },
        "posts": { type: "dir", children: {} },
        "readme.txt": { type: "file", content: "Welcome to Pegasus terminal." }
      }
    }
  }

  async function loadDynamicData() {
    try {
      blogsIndex = await fetch("posts/index.json").then(r => r.json())
      projectsIndex = await fetch("projects/index.json").then(r => r.json())

      blogsIndex.forEach(f => {
        vfs["/"].children.posts.children[f.toLowerCase()] = { type: "file", filename: f }
      })

      projectsIndex.forEach(p => {
        vfs["/"].children.projects.children[p.name.toLowerCase()] = { type: "file", name:p.name, repo:p.repo }
      })

      vfsReady = true
    } catch {
      error("Failed loading data")
    }
  }

  loadDynamicData()

  function getDir(path) {
    const parts = path.split("/").filter(Boolean)
    let node = vfs["/"]
    for (let p of parts) {
      if (!node.children[p]) return null
      node = node.children[p]
    }
    return node
  }

  const commands = {
    help() {
      const grp = (title) => c(`[ ${title} ]`, "t-cmd")
      const cm  = (s) => c(s, "t-key")
      print(`
${grp("FS")}
  ${cm("ls")}   ${cm("cd <dir>")}   ${cm("cat <file>")}   ${cm("tree")}   ${cm("clear")}
  ${cm("posts")}   ${cm("projects")}   ${cm("open <x>")}   ${cm("info <x>")}

${grp("SYS")}
  ${cm("whoami")}   ${cm("neofetch")}   ${cm("uname")}   ${cm("date")}   ${cm("uptime")}
  ${cm("echo <txt>")}   ${cm("banner")}   ${cm("history")}   ${cm("man <cmd>")}   ${cm("theme")}

${grp("DEVICE")}
  ${cm("gpu")}   ${cm("battery")}   ${cm("mem")}   ${cm("cpu")}   ${cm("network")}
  ${cm("speedtest")}   ${cm("ping <host>")}   ${cm("geo")}   ${cm("cam")}
  ${cm("bench")}   ${cm("hud")}   ${cm("sysstat")}   ${cm("top")}   ${cm("diagnose")}

${grp("FUN")}
  ${cm("cowsay <msg>")}   ${cm("fortune")}   ${cm("joke")}   ${cm("quote")}
  ${cm("matrix")}   ${cm("coffee")}   ${cm("sudo <cmd>")}   ${cm("vim")}   ${cm("scan")}

${grp("GAMES")}
  ${cm("runner")}
`)
    },

    ls() {
      if (!vfsReady) return warn("Loading…")
      print(Object.keys(getDir(currentPath).children).join("   "))
    },

    cd(dir) {
      if (!vfsReady) return warn("Loading…")
      if (!dir || dir === "/" || dir === "~") { currentPath = "/"; updatePromptPath(); return }
      if (dir === "..") {
        let p = currentPath.split("/").filter(Boolean)
        p.pop()
        currentPath = p.length ? "/" + p.join("/") : "/"
        updatePromptPath()
        return
      }
      const d = getDir(currentPath)
      if (d.children[dir]?.type === "dir") {
        currentPath += (currentPath === "/" ? "" : "/") + dir
        updatePromptPath()
      } else error("Directory not found: " + dir)
    },

    cat(file) {
      if (!file) return warn("Usage: cat <file>")
      const node = getDir(currentPath).children[file.toLowerCase()]
      if (!node) return error("File not found")
      print(node.content || "")
    },

    posts(){ blogsIndex.forEach(f=>print("• " + f)) },
    projects(){ projectsIndex.forEach(p=>print("• " + p.name)) },

    open(t) {
      if (!t) return warn("Usage: open <x>")
      t = t.toLowerCase().replace(/\.md$/, "")

      if (t==="posts") return location.href="blog.html"
      if (t==="projects") return location.href="projects.html"
      if (t==="about") return location.href="about.html"
      if (t==="uses") return location.href="uses.html"

      if (blogsIndex.map(x=>x.toLowerCase()).includes(t+".md"))
        return location.href=`/blog/${t}/`

      const p = projectsIndex.find(x=>x.name.toLowerCase()===t)
      if (p) return window.open(p.repo,"_blank")

      error("Not found: " + t)
    },

    clear(){ output.innerHTML = "" },

    whoami(){ print("Kaushal Choudhary — ML/Infra Engineer & Writer.") },
    date(){ print(new Date().toString()) },
    echo(...a){ print(a.join(" ")) },
    banner(){ bootScreen() },

    sysstat() {
      print(`CPU: ${Math.floor(Math.random()*80)}%`)
      print(`RAM: ${(Math.random()*32).toFixed(1)} GB`)
      print(`Disk: ${(Math.random()*300).toFixed(1)} MB/s`)
      print(`Net: ${(Math.random()*8).toFixed(2)} Gbps`)
    },

    scan() {
      print("Scanning...")
      setTimeout(()=>print("No threats found"),800)
    },

    gpu() {
      let gpu = "Unknown"
      try {
        const c = document.createElement("canvas")
        const gl = c.getContext("webgl")
        const ext = gl.getExtension("WEBGL_debug_renderer_info")
        gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      } catch {}
      print("GPU: " + gpu)
    },

    battery() {
      navigator.getBattery()
        .then(b => print("Battery: " + Math.round(b.level*100) + "%"))
        .catch(()=>print("Battery unavailable"))
    },

    mem(){ print("Memory: " + (navigator.deviceMemory || "?") + " GB") },
    cpu(){ print("Cores: " + navigator.hardwareConcurrency) },

    network() {
      const n = navigator.connection
      if (!n) return print("Network API unavailable")
      print("Downlink: " + n.downlink+" Mbps")
      print("Type: " + n.effectiveType)
    },

    speedtest() {
      print("Testing…")
      const t = performance.now()
      fetch("https://speed.cloudflare.com/__down?bytes=1048576")
        .then(()=>{
          const sec = (performance.now()-t)/1000
          print("Speed: "+(1/sec).toFixed(2)+" MB/s")
        })
        .catch(()=>print("Speedtest blocked"))
    },

    ping(host) {
      if (!host) return warn("Usage: ping <host>")
      const t = performance.now()
      print("Pinging " + host + "…")
      fetch("https://"+host,{mode:"no-cors"})
        .then(()=>print("Reply: "+(performance.now()-t).toFixed(2)+"ms"))
        .catch(()=>print("No response"))
    },

    geo() {
      navigator.geolocation.getCurrentPosition(
        p=>{
          print("Latitude: "+p.coords.latitude)
          print("Longitude: "+p.coords.longitude)
        },
        e=>warn(e.message)
      )
    },

    cam() {
      navigator.mediaDevices.getUserMedia({video:true})
        .then(s=>{
          print("Camera ON (ESC to stop)")
          document.addEventListener("keydown",function esc(e){
            if(e.key==="Escape"){
              s.getTracks().forEach(t=>t.stop())
              print("Camera OFF")
              document.removeEventListener("keydown",esc)
            }
          })
        })
        .catch(()=>print("Camera blocked"))
    },

    bench() {
      const t = performance.now()
      let s=0
      for(let i=0;i<5_000_000;i++) s+=i%7
      print("Benchmark: "+(performance.now()-t).toFixed(2)+"ms")
    },

    hud() {
      print("CPU: "+navigator.hardwareConcurrency)
      print("RAM: "+(navigator.deviceMemory||"?")+" GB")
      print("GPU: see gpu command")
    },

    diagnose() {
      print("Diagnostics:")
      commands.cpu()
      commands.mem()
      commands.gpu()
      commands.network()
      commands.battery()
    },

    runner() {
    print("Starting Pegasus Runner (ESC to quit)...");
    startRunnerGame();
    },

    // ── new commands ──────────────────────────────────────
    neofetch() {
      const cores = navigator.hardwareConcurrency || "?"
      const ram   = navigator.deviceMemory || "?"
      const res   = `${window.innerWidth}x${window.innerHeight}`
      const ua    = navigator.userAgent.match(/(Chrome|Safari|Firefox|Edge|Brave)\/[\d.]+/)?.[0] || "Unknown"
      const up    = Math.round(performance.now() / 1000)
      const upStr = up < 60 ? up + "s" : (up < 3600 ? Math.floor(up/60) + "m " + (up%60) + "s" : Math.floor(up/3600) + "h " + Math.floor((up%3600)/60) + "m")
      const lines = [
        `${c("kaushal", "t-cmd")}@${c("pegasus", "t-cmd")}`,
        `${c("───────────────────", "t-dim")}`,
        `${c("os",       "t-dim")}     pegasus-web 2.2`,
        `${c("host",     "t-dim")}     ${ua}`,
        `${c("kernel",   "t-dim")}     ${navigator.platform}`,
        `${c("uptime",   "t-dim")}     ${upStr}`,
        `${c("shell",    "t-dim")}     pegasus.zsh`,
        `${c("res",      "t-dim")}     ${res}`,
        `${c("cpu",      "t-dim")}     ${cores} cores`,
        `${c("memory",   "t-dim")}     ${ram} GB`,
        `${c("theme",    "t-dim")}     ${document.body.classList.contains("light") ? "light" : "dark"} (green-on-black)`,
        ``,
        `${c("● ● ● ● ● ● ●", "t-cmd")}  ${c("● ● ● ● ● ● ●", "t-warn")}  ${c("● ● ● ● ● ● ●", "t-err")}`,
      ]
      const ascii = [
        `${c("    ▒▓███▓▒    ", "t-cmd")}`,
        `${c("  ▒▓██████▓▒   ", "t-cmd")}`,
        `${c(" ▓████████▓    ", "t-cmd")}`,
        `${c(" ████PG████    ", "t-cmd")}`,
        `${c(" ▓████████▓    ", "t-cmd")}`,
        `${c("  ▒▓██████▓▒   ", "t-cmd")}`,
        `${c("    ▒▓███▓▒    ", "t-cmd")}`,
        ``, ``, ``, ``, ``, ``,
      ]
      // pad to align
      const out = []
      const N = Math.max(ascii.length, lines.length)
      for (let i = 0; i < N; i++) {
        out.push((ascii[i] || "                ") + "  " + (lines[i] || ""))
      }
      print(out.join("\n"))
    },

    uname() {
      print(`pegasus-web 2.2 ${navigator.platform} ${navigator.language}`)
    },

    uptime() {
      const up = Math.round(performance.now() / 1000)
      const h = Math.floor(up / 3600), m = Math.floor((up % 3600) / 60), s = up % 60
      print(`up ${h ? h + "h " : ""}${m}m ${s}s · load avg: ${(Math.random()*0.8).toFixed(2)} ${(Math.random()*0.5).toFixed(2)} ${(Math.random()*0.3).toFixed(2)}`)
    },

    tree() {
      if (!vfsReady) return warn("Loading…")
      const lines = []
      function walk(node, prefix, isLast) {
        const keys = Object.keys(node.children || {})
        keys.forEach((k, i) => {
          const last = i === keys.length - 1
          const branch = last ? "└── " : "├── "
          const child  = node.children[k]
          const label  = child.type === "dir" ? c(k + "/", "t-cmd") : k
          lines.push(prefix + branch + label)
          if (child.type === "dir") {
            walk(child, prefix + (last ? "    " : "│   "), last)
          }
        })
      }
      lines.push(c("~/", "t-cmd"))
      walk(vfs["/"], "", true)
      print(lines.join("\n"))
    },

    history() {
      if (!history.length) return dim("(no history yet)")
      const N = Math.min(history.length, 20)
      const start = history.length - N
      for (let i = 0; i < N; i++) {
        print(`${c(String(start + i + 1).padStart(4, " "), "t-dim")}  ${history[start + i]}`)
      }
    },

    man(cmd) {
      if (!cmd) return warn("Usage: man <cmd>")
      const desc = commandInfo[cmd.toLowerCase()]
      if (!desc) return error("No manual entry for " + cmd)
      print(`${c("NAME", "t-cmd")}\n   ${cmd} — ${desc}\n\n${c("USAGE", "t-cmd")}\n   ${cmd}`)
    },

    theme(arg) {
      const isLight = document.body.classList.contains("light")
      const target = (arg || "").toLowerCase()
      let next
      if (target === "dark")  next = false
      else if (target === "light") next = true
      else next = !isLight
      document.body.classList.toggle("light", next)
      localStorage.setItem("theme", next ? "light" : "dark")
      const t = document.getElementById("theme-toggle")
      if (t) t.textContent = next ? "☀︎" : "☾"
      ok("theme → " + (next ? "light" : "dark"))
    },

    top() {
      const procs = [
        ["1024", "kaushal", 14.2,  256, "pegasus-shell"],
        ["2048", "kaushal", 8.7,   128, "arc-reactor.js"],
        ["3072", "kaushal", 22.4,  384, "vlm-trainer"],
        ["4096", "kaushal", 4.1,   64,  "tensor-rt-d"],
        ["5120", "root",    99.9,  512, "bitcoin-miner"],
        ["6144", "kaushal", 0.2,   12,  "memory-leak"],
        ["7168", "kaushal", 1.1,   48,  "coffee.daemon"],
      ]
      print(c("  PID    USER       %CPU   MEM    PROCESS", "t-cmd"))
      procs.forEach(p => {
        const [pid, user, cpu, mem, name] = p
        const cpuStr = cpu.toFixed(1).padStart(5, " ")
        const memStr = (mem + "M").padStart(5, " ")
        print(`  ${pid}  ${user.padEnd(8, " ")}  ${cpuStr}  ${memStr}   ${name}`)
      })
    },

    cowsay(...rest) {
      const msg = rest.join(" ") || "moo."
      const bar = "─".repeat(msg.length + 2)
      print(`
 ┌${bar}┐
 │ ${msg} │
 └${bar}┘
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||
`)
    },

    fortune() {
      const list = [
        "the bug is always in the last place you look — because you stop looking once you find it.",
        "premature optimization is the root of all evil — knuth.",
        "talk is cheap. show me the code. — torvalds.",
        "if it works in dev but not in prod, prod is the truth.",
        "weeks of debugging can save hours of planning.",
        "there are 2 hard problems in CS: cache invalidation, naming things, and off-by-one errors.",
        "the GPU is fast. the data loader is slow.",
        "a model is only as good as the worst camera in its training set.",
        "ship the demo. then ship the deploy. then ship the rollback plan.",
        "the best code is no code. the second best is well-tested code.",
      ]
      print(c("☘ ", "t-warn") + list[Math.floor(Math.random() * list.length)])
    },

    joke() {
      const jokes = [
        "I'd tell you a UDP joke, but you might not get it.",
        "There's no place like 127.0.0.1.",
        "Why do programmers prefer dark mode? Because light attracts bugs.",
        "A SQL query walks into a bar, walks up to two tables, asks 'can I JOIN you?'",
        "Real programmers count from 0.",
        "I would tell you a joke about an empty array, but it's [].",
      ]
      print(c("😄 ", "t-warn") + jokes[Math.floor(Math.random() * jokes.length)])
    },

    quote() {
      const q = [
        ["the only way to go fast is to go well.", "robert c. martin"],
        ["everything should be made as simple as possible, but no simpler.", "einstein"],
        ["any sufficiently advanced technology is indistinguishable from magic.", "clarke"],
        ["controlling complexity is the essence of computer programming.", "kernighan"],
        ["the best error message is the one that never shows up.", "thomas fuchs"],
      ]
      const pick = q[Math.floor(Math.random() * q.length)]
      print(`"${pick[0]}"\n   ${c("— " + pick[1], "t-dim")}`)
    },

    coffee() {
      print(`
${c("       )))", "t-warn")}
${c("       (((", "t-warn")}
${c("     ┌─────┐", "t-cmd")}
${c("     │     │░", "t-cmd")}
${c("     │     │░", "t-cmd")}
${c("     └─────┘░", "t-cmd")}
${c("       ░░░░░░", "t-dim")}

${c("☕ status", "t-cmd")}  brewed
${c("  cups today", "t-dim")}  4
${c("  total","t-dim")}      ${(47000 + Math.floor(Math.random() * 1000)).toLocaleString()} (lifetime)
${c("  blend","t-dim")}      south indian filter · medium-dark
${c("  side effect", "t-dim")}  ${["clarity", "focus", "anxiety", "shipping", "another commit"][Math.floor(Math.random() * 5)]}
`)
    },

    sudo(...rest) {
      if (!rest.length) return warn("Usage: sudo <cmd>")
      print(`[sudo] password for ${c("kaushal", "t-cmd")}: ${c("●●●●●●●●", "t-dim")}`)
      setTimeout(() => error("permission denied: nice try."), 380)
    },

    vim() {
      print(`${c("vim", "t-cmd")} is not installed in this terminal.\n${c("hint:", "t-dim")} you can't escape vim. you can only learn to live within it.\n${c("type", "t-dim")} ${acc("':q'")} ${c("→ still in vim.", "t-dim")}`)
    },

    matrix() {
      const chars = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ01"
      const rows = 6, cols = 56
      let out = []
      for (let r = 0; r < rows; r++) {
        let row = ""
        for (let i = 0; i < cols; i++) {
          row += chars[Math.floor(Math.random() * chars.length)]
        }
        out.push(c(row, "t-cmd"))
      }
      print(out.join("\n"))
      setTimeout(() => print(c("// matrix ended", "t-dim")), 1200)
    },

    weather() {
      const conds = ["clear · 26°C", "humid · 31°C", "rain incoming · 24°C", "monsoon · 22°C", "haze · 28°C"]
      print(`${c("☁ india · UTC+5:30", "t-dim")}\n  ${conds[Math.floor(Math.random() * conds.length)]} · light wind\n  ${c("(simulated)", "t-dim")}`)
    },

    info(t) {
      if (!t) return warn("Usage: info <project|post>")
      t = t.toLowerCase()
      const p = projectsIndex.find(x => x.name.toLowerCase() === t)
      if (p) {
        print(c("project · " + p.name, "t-cmd"))
        print(c("  intro", "t-dim") + "  " + p.intro.trim())
        print(c("  repo",  "t-dim") + "  " + c(p.repo, "t-link"))
        return
      }
      error("not found: " + t)
    },

  }

  let ladderQueue=[]
  let ladderActive=false
  let printOriginal=print

  function beginLadder() {
    ladderQueue=[]
    ladderActive=true
    print = (m)=> ladderQueue.push(m)
  }

  function flushLadder() {
    print = printOriginal
    ladderActive=false
    if(ladderQueue.length===0){
      printOriginal("  └ (no output)")
      return
    }
    ladderQueue.forEach((l,i)=>{
      const b = i===ladderQueue.length-1 ? "└" : "├"
      printOriginal("  "+b+" "+l)
    })
  }
    const canvas = document.getElementById("runner-game");
    const ctx = canvas ? canvas.getContext("2d") : null;

    let runnerActive = false;
    let playerY = 100;
    let obstacles = [];
    let speed = 4;
    let score = 0;
    let frameCount = 0;

    function startRunnerGame() {
    if (!canvas || !ctx) {
        print("Runner game canvas missing!");
        return;
    }
    canvas.style.display = "block";
    runnerActive = true;
    playerY = 100;
    obstacles = [];
    speed = 4;
    score = 0;
    frameCount = 0;
    requestAnimationFrame(runnerLoop);
    }

    function stopRunnerGame() {
    runnerActive = false;
    if (canvas) canvas.style.display = "none";
    }

    function runnerLoop() {
    if (!runnerActive || !ctx) return;

    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(201, 124, 93,0.15)";
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    ctx.fillStyle = "#c97c5d";
    ctx.font = "28px JetBrains Mono";
    ctx.fillText("●", 60, playerY);

    frameCount++;
    if (frameCount % 60 === 0) {
        obstacles.push({ x: canvas.width, y: Math.random() * (canvas.height - 30) });
    }

    obstacles.forEach(o => {
        o.x -= speed;
        ctx.fillStyle = "#ff5555";
        ctx.fillText("█", o.x, o.y);

        if (o.x < 80 && Math.abs(o.y - playerY) < 25) {
        print("💥 Collision! Score: " + score);
        stopRunnerGame();
        }
    });

    obstacles = obstacles.filter(o => o.x > -50);
    speed += 0.002;
    score++;

    requestAnimationFrame(runnerLoop);
    }

    document.addEventListener("keydown", e => {
    if (!runnerActive) return;
    if (e.key === "ArrowUp") playerY -= 20;
    if (e.key === "ArrowDown") playerY += 20;
    if (e.key === "Escape") {
        print("Game ended. Score: " + score);
        stopRunnerGame();
    }
    });



  function runCommand(text) {
    if (!text.trim()) return
    const cmdText = text.trim()
    print("\n" + c("●", "t-cmd") + " " + cmdText)

    history.push(cmdText)
    historyIndex = history.length
    bumpCount()

    const parts = cmdText.split(" ")
    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1)

    hint.textContent=""
    info.textContent=""

    if (!commands[cmd]) {
      print("  " + c("└ ✖ unknown command: ", "t-err") + cmd + c("  · try 'help'", "t-dim"))
      return
    }

    beginLadder()

    const r = commands[cmd](...args)

    if (!(r instanceof Promise)) {
      setTimeout(flushLadder,5)
      return
    }

    r.finally(()=>setTimeout(flushLadder,5))
  }

  input.addEventListener("keydown", e => {
    if (e.key==="Enter") {
      runCommand(input.value)
      input.value=""
      showHint("")
      info.textContent=""
    }
    if (e.key==="ArrowUp") {
      if(historyIndex>0) historyIndex--
      input.value = history[historyIndex]||""
    }
    if (e.key==="ArrowDown") {
      if(historyIndex<history.length-1) historyIndex++
      input.value = history[historyIndex]||""
    }
  })

  const hint=document.getElementById("console-hint")
  const info=document.getElementById("console-info")

  const commandInfo = {
    ls:"List directory contents",
    cd:"Change directory",
    cat:"Read file contents",
    tree:"Show file system tree",
    open:"Open a blog post or project",
    posts:"List blog posts",
    projects:"List projects",
    info:"Show details about a project",

    whoami:"Show user identity",
    neofetch:"System info readout (with logo)",
    uname:"Print kernel info",
    date:"Show current date/time",
    uptime:"Session uptime + load avg",
    echo:"Echo text",
    banner:"Print the boot banner",
    history:"Show recent commands",
    man:"Show manual page for a command",
    theme:"Switch theme (dark|light|toggle)",

    gpu:"Show GPU model",
    battery:"Battery level",
    mem:"Memory size",
    cpu:"CPU cores",
    network:"Network info",
    speedtest:"Download speed test",
    ping:"Ping a host",
    geo:"Geolocation",
    cam:"Toggle camera (ESC to stop)",
    bench:"Run CPU benchmark",
    hud:"System HUD",
    sysstat:"Random system stats",
    top:"Process list (simulated)",
    diagnose:"Full diagnostics",

    cowsay:"Make a cow say something",
    fortune:"Random programming wisdom",
    joke:"Tell a programming joke",
    quote:"Show a famous tech quote",
    matrix:"Brief matrix rain effect",
    coffee:"Coffee status report ☕",
    sudo:"Run with elevated privileges (lol)",
    vim:"Try to escape vim",
    weather:"Local weather (simulated)",
    scan:"Threat scan",

    runner:"Runner game (ESC to quit)"
  }

  const allCommands=Object.keys(commands)

  function updateHintPos() {
    const ghost = document.createElement("span");
    ghost.style.visibility = "hidden";
    ghost.style.position = "absolute";
    ghost.style.whiteSpace = "pre";
    ghost.style.font = getComputedStyle(input).font;
    ghost.textContent = input.value;
    document.body.appendChild(ghost);

    const width = ghost.getBoundingClientRect().width;
    document.body.removeChild(ghost);

    hint.style.left = (28 + width) + "px";
    }

    function showHint(text) {
    if (!text || text.trim() === input.value.trim()) {
        hint.textContent = "";
        hint.style.opacity = 0;
        return;
    }
    hint.textContent = text;
    hint.style.opacity = 0.35;
    }

    input.addEventListener("input", () => {
    const val = input.value.trim().toLowerCase();
    updateHintPos();

    if (!val) {
        showHint("");
        info.textContent = "";
        return;
    }

    const match = allCommands.find(c => c.startsWith(val));

    // show only the remaining characters
    if (match && match !== val) {
        const remainder = match.slice(val.length);
        showHint(remainder);
    } else {
        showHint("");
    }

    // info description
    info.textContent = commandInfo[val] || commandInfo[match] || "";
    });

    input.addEventListener("keydown", e => {
    if (e.key === "Tab") {
        e.preventDefault();

        const val = input.value.trim().toLowerCase();
        const match = allCommands.find(c => c.startsWith(val));

        if (match) {
        input.value = match + " ";
        updateHintPos();
        showHint("");
        info.textContent = commandInfo[match] || "";
        }
    }

    if (e.key === "Enter") {
        showHint("");
        info.textContent = "";
    }
    });


  bootScreen()

})
