// Ember flow field. Glowing embers rise from a warm forge-glow at the base,
// drifting on a noise-driven flow field, hot gold-white when young and cooling
// to deep clay-red as they rise and fade. Spark trails + additive bloom. The
// cursor stirs the flow. Clipped to a disc so it stays orb-shaped and matches
// the terracotta palette. (Canvas id kept as "arc-reactor".)

(function () {
  const canvas = document.getElementById("arc-reactor");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const SIZE = 240;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const CLIP_R = 114;
  let dpr = window.devicePixelRatio || 1;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.style.width = SIZE + "px";
    canvas.style.height = SIZE + "px";
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  function isLight() {
    return document.body.classList.contains("light");
  }

  // Warm ember gradient: cold (old) -> mid -> hot (young).
  // Dark theme runs additive (blooms); light theme uses deeper, opaque clay.
  function emberColor(life) {
    // life: 1 (just born, hottest) -> 0 (dying)
    let c;
    if (life > 0.6) {
      const f = (life - 0.6) / 0.4; // 0..1 toward hot
      c = lerp3([232, 150, 84], isLight() ? [150, 70, 40] : [255, 232, 178], f);
    } else {
      const f = life / 0.6; // 0..1 toward mid
      c = lerp3([150, 60, 40], [232, 150, 84], f);
    }
    return c;
  }
  function lerp3(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }

  // ── flow field (cheap layered-sine pseudo-noise) ─────────────────
  function flowAngle(x, y, t) {
    const s = 0.018;
    const n =
      Math.sin(x * s + t * 0.5) +
      Math.cos(y * s * 1.2 - t * 0.4) +
      Math.sin((x + y) * s * 0.7 + t * 0.25);
    return n * 1.4;
  }

  // ── embers ────────────────────────────────────────────────────────
  const N = 150;
  const embers = [];

  function spawn(em, fill) {
    em.x = CX + (Math.random() - 0.5) * 80;
    em.y = CY + 40 + Math.random() * 55;        // born low in the disc
    em.vx = (Math.random() - 0.5) * 0.3;
    em.vy = -(0.25 + Math.random() * 0.5);
    em.maxLife = 2.6 + Math.random() * 2.8;
    em.life = fill ? Math.random() : 1;          // stagger on first fill
    em.size = 0.8 + Math.random() * 1.7;
    em.px = em.x;
    em.py = em.y;
  }
  for (let i = 0; i < N; i++) {
    const em = {};
    spawn(em, true);
    embers.push(em);
  }

  // ── cursor (in canvas coords) ─────────────────────────────────────
  let mcx = -999, mcy = -999, mActive = 0;
  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mcx = e.clientX - rect.left;
    mcy = e.clientY - rect.top;
    mActive = mcx > -50 && mcx < SIZE + 50 && mcy > -50 && mcy < SIZE + 50 ? 1 : 0;
  });

  let t0 = performance.now();
  let last = t0;

  function frame(now) {
    const time = (now - t0) / 1000;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // clamp after tab-switch
    const light = isLight();

    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, CLIP_R, 0, Math.PI * 2);
    ctx.clip();

    // Forge glow pool at the base.
    const baseY = CY + 70;
    const pool = ctx.createRadialGradient(CX, baseY, 0, CX, baseY, 110);
    pool.addColorStop(0, light ? "rgba(177, 92, 60, 0.22)" : "rgba(224, 132, 70, 0.30)");
    pool.addColorStop(0.5, light ? "rgba(177, 92, 60, 0.08)" : "rgba(201, 100, 60, 0.12)");
    pool.addColorStop(1, "rgba(201, 100, 60, 0)");
    ctx.fillStyle = pool;
    ctx.fillRect(0, 0, SIZE, SIZE);

    if (!light) ctx.globalCompositeOperation = "lighter";

    for (const em of embers) {
      // flow + rise
      const fa = flowAngle(em.x, em.y, time);
      em.vx += Math.cos(fa) * 0.05;
      em.vy += Math.sin(fa) * 0.05;
      em.vy -= 0.05; // buoyancy

      // cursor stir: swirl + push outward
      if (mActive) {
        const dx = em.x - mcx, dy = em.y - mcy;
        const d2 = dx * dx + dy * dy;
        if (d2 < 2600) {
          const d = Math.sqrt(d2) || 1;
          const fall = 1 - d / 51;
          em.vx += ((-dy / d) * 0.5 + (dx / d) * 0.3) * fall; // tangential + radial
          em.vy += ((dx / d) * 0.5 + (dy / d) * 0.3) * fall;
        }
      }

      em.vx *= 0.95;
      em.vy *= 0.97;
      // speed cap
      const sp = Math.hypot(em.vx, em.vy);
      if (sp > 2.2) { em.vx *= 2.2 / sp; em.vy *= 2.2 / sp; }

      em.px = em.x; em.py = em.y;
      em.x += em.vx * dt * 60;
      em.y += em.vy * dt * 60;
      em.life -= dt / em.maxLife;

      // respawn when dead or drifted out of the disc
      const out = Math.hypot(em.x - CX, em.y - CY) > CLIP_R + 6;
      if (em.life <= 0 || out) { spawn(em, false); continue; }

      const [r, g, b] = emberColor(em.life);
      const alpha = Math.min(1, em.life * 1.5) * (light ? 0.85 : 0.95);
      const rad = em.size * (0.45 + 0.55 * em.life);

      // spark trail
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`;
      ctx.lineWidth = rad * 0.9;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(em.px, em.py);
      ctx.lineTo(em.x, em.y);
      ctx.stroke();

      // bloom halo for the hottest young embers
      if (!light && em.life > 0.65) {
        const hr = rad * 6;
        const halo = ctx.createRadialGradient(em.x, em.y, 0, em.x, em.y, hr);
        halo.addColorStop(0, `rgba(255, 220, 170, ${0.3 * em.life})`);
        halo.addColorStop(1, "rgba(255, 220, 170, 0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(em.x, em.y, hr, 0, Math.PI * 2);
        ctx.fill();
      }

      // core dot
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(em.x, em.y, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // faint framing ring
    ctx.strokeStyle = light ? "rgba(177, 92, 60, 0.18)" : "rgba(201, 124, 93, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(CX, CY, CLIP_R, 0, Math.PI * 2);
    ctx.stroke();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
