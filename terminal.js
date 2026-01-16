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

  function warn(t) { print("⚠ " + t) }
  function error(t){ print("❌ " + t) }

  function bootScreen() {
    print(`
<span class="ascii">
██████╗ ███████╗ ██████╗  █████╗ ███████╗██╗   ██╗███████╗
██╔══██╗██╔════╝██╔════╝ ██╔══██╗██╔════╝██║   ██║██╔════╝
██████╔╝█████╗  ██║  ███╗███████║███████╗██║   ██║███████╗
██╔═══╝ ██╔══╝  ██║   ██║██╔══██║╚════██║██║   ██║╚════██║
██║     ███████╗╚██████╔╝██║  ██║███████║╚██████╔╝███████║
╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝

<span class="ascii-sub">Pegasus Terminal v2.1. Type 'help' to begin.</span>
</span>
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
      print(`
[ FS ]
ls   cd   cat   clear
posts   projects   open <x>   info <x>

[ SYS ]
whoami   date   echo   banner   scan   sysstat

[ DEVICE ]
gpu   battery   mem   cpu   network   speedtest   ping <host>   
geo   cam   bench   hud   diagnose

[ GAMES ]
  runner
`)
    },

    ls() {
      if (!vfsReady) return warn("Loading…")
      print(Object.keys(getDir(currentPath).children).join("   "))
    },

    cd(dir) {
      if (!vfsReady) return warn("Loading…")
      if (!dir || dir === "/") return currentPath = "/"
      if (dir === "..") {
        let p = currentPath.split("/").filter(Boolean)
        p.pop()
        currentPath = p.length ? "/" + p.join("/") : "/"
        return
      }
      const d = getDir(currentPath)
      if (d.children[dir]?.type === "dir")
        currentPath += (currentPath === "/" ? "" : "/") + dir
      else error("Directory not found")
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
      t = t.toLowerCase()

      if (t==="posts") return location.href="blog.html"
      if (t==="projects") return location.href="projects.html"

      if (blogsIndex.map(x=>x.toLowerCase()).includes(t+".md"))
        return location.href=`blog-post.html?file=${t}.md`

      const p = projectsIndex.find(x=>x.name.toLowerCase()===t)
      if (p) return window.open(p.repo,"_blank")

      error("Not found")
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
    }
    

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

    ctx.strokeStyle = "rgba(0,255,180,0.15)";
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    ctx.fillStyle = "#00ffb7";
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
    print("\n● " + cmdText)

    history.push(cmdText)
    historyIndex = history.length

    const parts = cmdText.split(" ")
    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1)

    hint.textContent=""
    info.textContent=""

    if (!commands[cmd]) {
      print("  └ ✖ Unknown command")
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
    ls:"List directory",
    cd:"Change directory",
    cat:"Read file",
    open:"Open blog/project",
    posts:"List blog posts",
    projects:"List projects",
    whoami:"Show user identity",
    date:"Show date",
    echo:"Echo text",
    gpu:"Show GPU name",
    battery:"Battery level",
    mem:"Memory",
    cpu:"CPU cores",
    network:"Network info",
    speedtest:"Download speed test",
    ping:"Ping host",
    geo:"Geolocation",
    cam:"Camera access",
    bench:"CPU benchmark",
    hud:"System HUD",
    diagnose:"Full diagnostics",
    runner:"Runner game"
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
