/************************************************************
 * PEGASUS TERMINAL
 ************************************************************/

document.addEventListener("DOMContentLoaded", () => {

  const panel  = document.getElementById("terminal-wrapper");
  const output = document.getElementById("console-output");
  const input  = document.getElementById("console-input");

  if (!panel || !output || !input) {
    console.error("❌ Terminal elements missing — check HTML structure.");
    return;
  }

  function asciiScale() {
    let termWidth = panel.clientWidth;

    if (termWidth > 900) output.style.fontSize = "20px";
    else if (termWidth > 700) output.style.fontSize = "18px";
    else if (termWidth > 500) output.style.fontSize = "17px";
    else output.style.fontSize = "12px";
  }

  window.addEventListener("resize", asciiScale);

  function print(text) {
    if (!output) return;
    output.innerHTML += text + "\n";
    output.scrollTop = output.scrollHeight;
  }

  function warn(msg) { print(`⚠ ${msg}`); }
  function error(msg) { print(`❌ ${msg}`); }


  function bootScreen() {
    print(`
<span class="ascii">
██████╗ ███████╗ ██████╗  █████╗ ███████╗██╗   ██╗███████╗
██╔══██╗██╔════╝██╔════╝ ██╔══██╗██╔════╝██║   ██║██╔════╝
██████╔╝█████╗  ██║  ███╗███████║███████╗██║   ██║███████╗
██╔═══╝ ██╔══╝  ██║   ██║██╔══██║╚════██║██║   ██║╚════██║
██║     ███████╗╚██████╔╝██║  ██║███████║╚██████╔╝███████║
╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝
Pegasus Terminal v2.1. Type 'help' to begin.
</span>
        `);
    asciiScale();
  }

  let history = [];
  let historyIndex = -1;
  let blogsIndex = [];
  let projectsIndex = [];
  let vfsReady = false;
  let currentPath = "/";
  let vfs = {
    "/": {
      type: "dir",
      children: {
        "projects": { type: "dir", children: {} },
        "posts": { type: "dir", children: {} },
        "readme.txt": { type: "file", content: "Welcome to the Pegasus terminal. I built this for the terminal enjoyers." }
      }
    }
  };

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
          desc: p.desc || "No description."
        };
      });

      vfsReady = true;
    } catch (err) {
      error("Failed to load blog/project data.");
    }
  }

  loadDynamicData();

  function getDir(path) {
    const parts = path.split("/").filter(Boolean);
    let node = vfs["/"];
    for (let p of parts) {
      if (!node.children[p]) return null;
      node = node.children[p];
    }
    return node;
  }

  const commands = {
    help() {
        print(`
            Commands:

            [ FS ]
            ls          cd          cat             clear
            posts       projects    open &lt;x&gt;        info &lt;x&gt;

            [ SYS ]
            whoami      date        echo            banner
            ssh &lt;host&gt;  run-gpu     launch-seq
            sysstat     scan        uplink &lt;sat&gt;    deploy &lt;env&gt;
            matrix

            [ SIM ]
            chernobyl   fusion-core    quantum-sim
            gpu-burn    orbit-track &lt;obj&gt;   thrusters-test

            [ REAL ]
            real-gpu      real-battery    real-mem
            real-cpu      real-network    real-speedtest
            real-ping &lt;host&gt;   geo        cam
            bench         hud            diagnose

            [ GAMES ]
            type-race    runner
        `);
    },

    ls() { if (!vfsReady) return warn("Loading filesystem…"); print(Object.keys(getDir(currentPath).children).join("   ")); },
    cd(dir) {
      if (!vfsReady) return warn("Loading…");
      if (!dir || dir === "/") return currentPath = "/";
      if (dir === "..") {
        let parts = currentPath.split("/").filter(Boolean);
        parts.pop();
        currentPath = parts.length ? "/" + parts.join("/") : "/";
        return;
      }
      const d = getDir(currentPath);
      if (d.children[dir]?.type === "dir") currentPath += (currentPath === "/" ? "" : "/") + dir;
      else error("Directory not found.");
    },

    cat(file) {
      if (!file) return warn("Usage: cat &lt;file&gt;  ");
      const node = getDir(currentPath).children[file.toLowerCase()];
      if (!node) return error("File not found");
      print(node.content || "(empty)");
    },

    posts() { blogsIndex.forEach(f => print("• " + f)); },
    projects() { projectsIndex.forEach(p => print("• " + p.name)); },

    open(target) {
      if (!target) return warn("Usage: open &lt;item&gt;");
      const t = target.toLowerCase();

      if (t === "posts") return location.href = "blog.html";
      if (t === "projects") return location.href = "projects.html";

      let f = t.endsWith(".md") ? t : t + ".md";
      if (blogsIndex.map(x => x.toLowerCase()).includes(f))
        return location.href = `blog-post.html?file=${f}`;

      const proj = projectsIndex.find(p => p.name.toLowerCase() === t);
      if (proj) return window.open(proj.repo, "_blank");

      error("Not found.");
    },

    clear() { output.innerHTML = ""; },

    whoami() { print("kaushal Choudhary: ML/Infra Engineer and Technical Writer."); },
    date() { print(new Date().toString()); },
    echo(...a) { print(a.join(" ")); },
    banner() { bootScreen(); },

    ssh(host) {
      if (!host) return warn("Usage: ssh &lt;host&gt;");
      print(`Connecting to ${host}...`);
      setTimeout(()=>print("Secure channel established."), 600);
      setTimeout(()=>print("Authenticated."), 1200);
      setTimeout(()=>print(`Welcome to ${host}`), 1800);
    },

    run_gpu() {
      print(`
        GPU STATUS
        Device: PegasusCore-9000
        Usage: ${Math.floor(Math.random()*80)+10}%
        Temp: ${Math.floor(Math.random()*40)+40}°C
        Memory: 48GB HBM3`);
    },

    launch_seq() {
      const steps=[
        "Fuel pressurized",
        "Gyro calibrated",
        "Telemetry green",
        "Thermals nominal",
        "Engines READY",
        "Ignition...",
        "🚀 LIFTOFF!"
      ];
      steps.forEach((msg,i)=>setTimeout(()=>print(msg), i*600));
    },

    sysstat() {
      print(`
        CPU Load: ${Math.floor(Math.random()*85)}%
        RAM: ${(Math.random()*32).toFixed(1)} GB
        Disk I/O: ${(Math.random()*350).toFixed(1)} MB/s
        Network: ${(Math.random()*9).toFixed(2)} Gbps`);
    },

    scan() {
      print("Scanning...");
      setTimeout(()=>print("Ports clean"),800);
      setTimeout(()=>print("No anomalies detected"),1500);
    },

    uplink(sat) {
      if (!sat) return warn("Usage: uplink &lt;sat&gt;");
      print("Syncing uplink...");
      setTimeout(()=>print("Beamforming..."),800);
      setTimeout(()=>print("Lock acquired ✔"),1500);
    },

    deploy(env) {
      print(`Deploying ${env}...`);
      setTimeout(()=>print("Build OK"),700);
      setTimeout(()=>print("Rollout complete"),1500);
    },

    matrix() {
      let running = true;
      function loop() {
        if (!running) return;
        const line = [...Array(60)]
          .map(()=>String.fromCharCode(0x30A0 + Math.random() * 96)).join("");
        print(line);
        setTimeout(loop, 40);
      }
      loop();

      const originalClear = commands.clear;
      commands.clear = () => {
        running = false;
        commands.clear = originalClear;
        originalClear();
      };
    },

    chernobyl() {
      print("⚠ RBMK REACTOR STATUS");
      setTimeout(()=>print("Temperature rising..."),500);
      setTimeout(()=>print("Coolant flow unstable"),1200);
      setTimeout(()=>print("Control rods jammed"),1800);
      setTimeout(()=>print("Power spike detected!"),2400);
      setTimeout(()=>print("💥 REACTOR EXPLOSION"),3000);
    },

    fusion_core() {
      print("Fusion Reactor:");
      setTimeout(()=>print("Plasma stable"),500);
      setTimeout(()=>print("Containment nominal"),1200);
      setTimeout(()=>print("Output increasing"),1900);
    },

    quantum_sim() {
      print("Running quantum register...");
      setTimeout(()=>print("Qubits entangled"),500);
      setTimeout(()=>print("Decoherence suppressed"),1200);
      setTimeout(()=>print("State collapsed ✔"),1800);
    },

    gpu_burn() {
      print("Starting GPU burn...");
      let i=0;
      function loop() {
        if (i > 25) return print("GPU burn complete");
        print("█".repeat(i));
        i++;
        setTimeout(loop, 70);
      }
      loop();
    },

    orbit_track(obj="object") {
      print(`Tracking orbit of ${obj}...`);
      setTimeout(()=>print("Altitude stable"),700);
      setTimeout(()=>print("Velocity nominal"),1400);
    },

    thrusters_test() {
      print("Testing thrusters...");
      setTimeout(()=>print("Temp OK"),500);
      setTimeout(()=>print("Pressure OK"),1100);
      setTimeout(()=>print("Thrust nominal ✔"),1700);
    },

    real_gpu() {
  const c = document.createElement("canvas");
  let gpu = "Unknown GPU";

  try {
    const gl = c.getContext("webgl");
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
  } catch(e){}

  print(`GPU: ${gpu}`);
},

real_battery() {
  navigator.getBattery()
    .then(b => print(`Battery Level: ${Math.round(b.level * 100)}%`))
    .catch(() => print("(no battery info)"));
},

real_mem() {
  let mem = navigator.deviceMemory || 0;
  print(`Memory: ${mem ? mem + " GB" : "Unknown GB"}`);
},

real_cpu() {
  print(`Cores: ${navigator.hardwareConcurrency}`);
},

real_network() {
  const n = navigator.connection;
  if (!n) return print("(network API unavailable)");
  print(`Downlink: ${n.downlink} Mbps`);
  print(`Type: ${n.effectiveType}`);
},

real_speedtest() {
  print("Running speed test…");
  const start = performance.now();
  fetch("https://speed.cloudflare.com/__down?bytes=1048576")
    .then(() => {
      const sec = (performance.now() - start) / 1000;
      print(`Speed: ${(1 / sec).toFixed(2)} MB/s`);
    })
    .catch(() => print("(speed test blocked)"));
},

real_ping(host) {
  if (!host) return warn("Usage: real-ping <host>");
  const start = performance.now();

  print(`Pinging ${host}…`);
  fetch("https://" + host, { mode: "no-cors" })
    .then(() => print(`Reply: ${(performance.now() - start).toFixed(2)}ms`))
    .catch(() => print("(no response)"));
},


    geo() {
      navigator.geolocation.getCurrentPosition(
        pos => {
          print("Latitude: " + pos.coords.latitude);
          print("Longitude: " + pos.coords.longitude);
        },
        err => warn(err.message)
      );
    },

    cam() {
      navigator.mediaDevices.getUserMedia({video:true})
        .then(stream=>{
          print("Camera ON (ESC to stop)");
          document.addEventListener("keydown", function esc(e){
            if (e.key === "Escape") {
              stream.getTracks().forEach(t=>t.stop());
              print("Camera stopped");
              document.removeEventListener("keydown", esc);
            }
          });
        })
        .catch(()=>print("Camera access denied"));
    },

    bench() {
      const start = performance.now();
      let s = 0;
      for (let i = 0; i < 5_000_000; i++) s += i % 7;
      print("Benchmark: " + (performance.now()-start).toFixed(2) + "ms");
    },

    hud() {
      print(`
        ┌────────────────────┐
        │     SYSTEM HUD      │
        ├────────────────────┤
        │ CPU: ${navigator.hardwareConcurrency} cores
        │ RAM: ${navigator.deviceMemory || "?"} GB
        └────────────────────┘`);
    },

    diagnose() {
      print("Running full diagnostics...");
      commands.real_cpu();
      commands.real_mem();
      commands.real_gpu();
      commands.real_network();
      commands.real_battery();
    },

    type_race_active:false,
    type_race_target:"",
    type_race_timer:null,

    type_race() {
      if (this.type_race_active) return warn("Game already running!");
      const words=["quantum","entropy","fusioncore","protocol7","darkmatter"];
      const target = words[Math.floor(Math.random()*words.length)];
      this.type_race_target = target;
      this.type_race_active = true;
      print("Type this EXACT string within 10s:\n>>> " + target);
      this.type_race_timer = setTimeout(()=>{
        if (this.type_race_active) {
          this.type_race_active = false;
          print("⏳ Time’s up!");
        }
      },10000);
    },

    runner() {
      print("Starting Pegasus Runner (ESC to quit)...");
      startRunnerGame();
    }
  };

  commands["run-gpu"] = commands.run_gpu;
  commands["launch-seq"] = commands.launch_seq;
  commands["gpu-burn"] = commands.gpu_burn;
  commands["orbit-track"] = commands.orbit_track;
  commands["thrusters-test"] = commands.thrusters_test;
  commands["fusion-core"] = commands.fusion_core;
  commands["quantum-sim"] = commands.quantum_sim;
  commands["real-gpu"] = commands.real_gpu;
  commands["real-battery"] = commands.real_battery;
  commands["real-mem"] = commands.real_mem;
  commands["real-cpu"] = commands.real_cpu;
  commands["real-network"] = commands.real_network;
  commands["real-speedtest"] = commands.real_speedtest;
  commands["real-ping"] = commands.real_ping;
  commands["type-race"] = commands.type_race;

let ladderActive = false;
let ladderBuffer = [];
let ladderFlushTimer = null;
let originalPrint = print;

function beginLadder() {
  ladderActive = true;
  ladderBuffer = [];

  originalPrint = print;

  print = function(msg) {
    ladderBuffer.push(msg);
  };

  restartLadderFlushTimer();
}

function restartLadderFlushTimer() {
  clearTimeout(ladderFlushTimer);
  ladderFlushTimer = setTimeout(finishLadder, 500);
}

function finishLadder() {
  ladderActive = false;

  print = originalPrint;

  if (ladderBuffer.length === 0) {
    print("  └ (no output)");
    return;
  }

  for (let i = 0; i < ladderBuffer.length; i++) {
    const branch = (i === ladderBuffer.length - 1) ? "└" : "├";
    print(`  ${branch} ${ladderBuffer[i]}`);
  }
}
function runCommand(text) {
  if (!text.trim()) return;

  const cmdText = text.trim();
  print(`\n● ${cmdText}`);

  history.push(cmdText);
  historyIndex = history.length;

  const parts = cmdText.split(" ");
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  // Clear existing hint
  hint.textContent = "";
  info.textContent = "";

  if (!commands[cmd]) {
    print("  └ ✖ Unknown command");
    return;
  }

  beginLadder();

  commands[cmd](...args);

  restartLadderFlushTimer();
}


  input.addEventListener("keydown", e => {

    if (e.key === "Enter") {
      runCommand(input.value);
      input.value = "";
    }

    if (e.key === "ArrowUp") {
      if (historyIndex > 0) historyIndex--;
      input.value = history[historyIndex] || "";
    }

    if (e.key === "ArrowDown") {
      if (historyIndex < history.length - 1) historyIndex++;
      input.value = history[historyIndex] || "";
    }
  });

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
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.strokeStyle="rgba(0,255,180,0.15)";
    for(let x=0;x<canvas.width;x+=40){
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,200); ctx.stroke();
    }
    for(let y=0;y<canvas.height;y+=40){
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(600,y); ctx.stroke();
    }

    ctx.fillStyle="#00ffb7";
    ctx.font="28px JetBrains Mono";
    ctx.fillText("●", 60, playerY);

    frameCount++;
    if (frameCount % 60 === 0) {
      obstacles.push({x:600, y:Math.random()*170});
    }

    obstacles.forEach(o => {
      o.x -= speed;
      ctx.fillStyle="#ff5555";
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

  const clickSound = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3");
  const hoverSound = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-interface-click-1126.mp3");

  document.querySelectorAll(".sound-hover").forEach(el => {
    el.addEventListener("mouseenter", ()=>{
      hoverSound.currentTime=0;
      hoverSound.play();
    });
    el.addEventListener("click", ()=>{
      clickSound.currentTime=0;
      clickSound.play();
    });
  });

  document.addEventListener("mousemove", e => {
    const layer = document.getElementById("parallax-layer");
    if (!layer) return;
    const dx = (e.clientX / window.innerWidth - 0.5) * 12;
    const dy = (e.clientY / window.innerHeight - 0.5) * 12;
    layer.style.transform = `translate(${dx}px,${dy}px)`;
  });


  /**************************************
     INLINE GHOST HINT + AUTO INFO + TAB
    **************************************/
    /**************************************
 INLINE GHOST HINT + AUTO INFO + TAB
**************************************/
const hint = document.getElementById("console-hint");
const info = document.getElementById("console-info");

const commandInfo = {
  ls: "List files in directory",
  cd: "Change directory",
  cat: "Read file",
  open: "Open blog/project",
  info: "Show project info",
  whoami: "Show user identity",
  ssh: "Simulated SSH login",
  "run-gpu": "GPU monitor",
  "launch-seq": "Rocket launch sim",
  scan: "Security scan",
  uplink: "Satellite uplink",
  deploy: "Simulated CI/CD deploy",
  matrix: "Matrix terminal effect",
  chernobyl: "Reactor meltdown sim",
  "fusion-core": "Fusion reactor sim",
  "quantum-sim": "Quantum register test",
  "gpu-burn": "Load GPU",
  "orbit-track": "Track orbit of object",
  "thrusters-test": "Test thrusters",
  "real-gpu": "Detect actual GPU",
  "real-network": "Real network stats",
  "real-ping": "Ping host",
  geo: "Get geolocation",
  cam: "Webcam access",
  bench: "CPU benchmark",
  hud: "System HUD",
  diagnose: "Full system diagnostics",
  "type-race": "Typing game",
  runner: "Runner game",
  "real-gpu": "Detect actual GPU name",
    "real-battery": "Read battery level",
    "real-mem": "Show device memory",
    "real-cpu": "Show CPU core count",
    "real-network": "Network info",
    "real-speedtest": "Download test",
    "real-ping": "Ping a host"
};

const allCommands = Object.keys(commands);

/* Correct ghost position */
function updateHintPosition() {
  const entered = input.value;
  const ghost = document.createElement("span");
  ghost.style.visibility = "hidden";
  ghost.style.position = "absolute";
  ghost.style.whiteSpace = "pre";
  ghost.style.font = getComputedStyle(input).font;
  ghost.textContent = entered;
  document.body.appendChild(ghost);
  const width = ghost.getBoundingClientRect().width;
  document.body.removeChild(ghost);
  hint.style.left = `${28 + width}px`;
}

/* Show or hide hint instantly */
function showHint(text) {
  if (!text || text.trim() === input.value.trim()) {
    hint.textContent = "";
    hint.style.opacity = 0;
    return;
  }
  hint.textContent = text;
  hint.style.opacity = 0.35;
}


/* LIVE TYPING PREVIEW */
input.addEventListener("input", () => {
  const val = input.value.trim().toLowerCase();

  updateHintPosition();

  /* If nothing typed — clear */
  if (!val) {
    showHint("");
    info.textContent = "";
    return;
  }

  const match = allCommands.find(cmd => cmd.startsWith(val));

  /* Only show ghost if partial match */
  if (match && match !== val) showHint(match);
  else showHint("");

  /* Info line */
  info.textContent = commandInfo[val] || commandInfo[match] || "";
});

/* TAB autocomplete */
input.addEventListener("keydown", e => {
  if (e.key === "Tab") {
    e.preventDefault();
    const val = input.value.trim().toLowerCase();
    const match = allCommands.find(cmd => cmd.startsWith(val));
    if (match) {
      input.value = match + " ";
      updateHintPosition();
      showHint("");
      info.textContent = commandInfo[match] || "";
    }
  }

  /* ENTER clears hint & info instantly */
  if (e.key === "Enter") {
    showHint("");
    info.textContent = "";
  }
});


  bootScreen();
  asciiScale();

}); // END
