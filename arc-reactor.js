// Arc-reactor / "new element" orb. Glowing nucleus with electrons orbiting on
// tilted 3D planes, plus a HUD ring. Replaces the old flat jarvis-orb.

(function () {
  const canvas = document.getElementById("arc-reactor");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const SIZE = 240;
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

  function palette() {
    return document.body.classList.contains("light")
      ? { main: "0, 150, 100", glow: "0, 200, 130", core: "120, 255, 200" }
      : { main: "0, 255, 175", glow: "0, 255, 200", core: "200, 255, 230" };
  }

  // Orbits live in their own local XY plane (z = 0), then are rotated by a
  // tilt around X and a twist around Z. Projection is orthographic — depth
  // (the resulting z) only modulates size and alpha so far/near reads right.
  const orbits = [
    { r: 56, tilt: 0.10, twist: 0.20, period: 3.4, count: 1, phase: 0.0 },
    { r: 70, tilt: 1.20, twist: 1.00, period: 4.6, count: 2, phase: 1.0 },
    { r: 82, tilt: -0.85, twist: 2.00, period: 5.8, count: 1, phase: 2.0 },
    { r: 64, tilt: 0.95, twist: -0.60, period: 2.9, count: 1, phase: 0.5 },
    { r: 76, tilt: -0.45, twist: 2.65, period: 3.7, count: 2, phase: 1.6 },
  ];

  const HUD_R = 96;
  const t0 = performance.now();

  function rotateXZ(p, ax, az) {
    // Rotate around X first (tilt the plane forward/back).
    const cy = Math.cos(ax), sy = Math.sin(ax);
    const y1 = p.y * cy - p.z * sy;
    const z1 = p.y * sy + p.z * cy;
    p.y = y1; p.z = z1;
    // Then rotate around Z (twist the orbit's "node line").
    const cz = Math.cos(az), sz = Math.sin(az);
    const x2 = p.x * cz - p.y * sz;
    const y2 = p.x * sz + p.y * cz;
    p.x = x2; p.y = y2;
    return p;
  }

  function drawOrbit(cx, cy, o, time, twist, accent) {
    // Trace the orbit ring as alpha-modulated dots so the far half fades.
    const samples = 96;
    for (let i = 0; i < samples; i++) {
      const a = (i / samples) * Math.PI * 2;
      const p = { x: Math.cos(a) * o.r, y: Math.sin(a) * o.r, z: 0 };
      rotateXZ(p, o.tilt, twist);
      const depth = (p.z + o.r) / (2 * o.r); // 0 = far, 1 = near
      const alpha = 0.08 + 0.30 * depth;
      ctx.fillStyle = `rgba(${accent.main}, ${alpha})`;
      ctx.fillRect(cx + p.x - 0.5, cy + p.y - 0.5, 1.2, 1.2);
    }

    // Electrons.
    for (let k = 0; k < o.count; k++) {
      const a = (time / o.period) * Math.PI * 2 + o.phase + (k / o.count) * Math.PI * 2;
      const p = { x: Math.cos(a) * o.r, y: Math.sin(a) * o.r, z: 0 };
      rotateXZ(p, o.tilt, twist);
      const depth = (p.z + o.r) / (2 * o.r);
      const r = 1.6 + depth * 2.4;

      const haloR = r * 7;
      const halo = ctx.createRadialGradient(cx + p.x, cy + p.y, 0, cx + p.x, cy + p.y, haloR);
      halo.addColorStop(0, `rgba(${accent.glow}, ${0.55 * (0.4 + 0.6 * depth)})`);
      halo.addColorStop(1, `rgba(${accent.glow}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx + p.x, cy + p.y, haloR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${0.55 + 0.45 * depth})`;
      ctx.beginPath();
      ctx.arc(cx + p.x, cy + p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawNucleus(cx, cy, time, accent) {
    const pulse = 1 + Math.sin(time * 2.2) * 0.08;
    const r = 9 * pulse;

    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70);
    halo.addColorStop(0, `rgba(${accent.glow}, 0.55)`);
    halo.addColorStop(0.45, `rgba(${accent.glow}, 0.16)`);
    halo.addColorStop(1, `rgba(${accent.glow}, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, 70, 0, Math.PI * 2);
    ctx.fill();

    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    core.addColorStop(0, `rgba(255, 255, 255, 1)`);
    core.addColorStop(0.45, `rgba(${accent.core}, 0.95)`);
    core.addColorStop(1, `rgba(${accent.main}, 0.4)`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHud(cx, cy, time, accent) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${accent.main}, 0.22)`;
    ctx.beginPath();
    ctx.arc(cx, cy, HUD_R, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(${accent.main}, 0.10)`;
    ctx.beginPath();
    ctx.arc(cx, cy, HUD_R - 8, 0, Math.PI * 2);
    ctx.stroke();

    // Tick marks rotating slowly — the "instrument" feel.
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2 + time * 0.12;
      const major = i % 4 === 0;
      const r1 = HUD_R + 2;
      const r2 = HUD_R + (major ? 8 : 4);
      ctx.strokeStyle = `rgba(${accent.main}, ${major ? 0.55 : 0.20})`;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.stroke();
    }

    // Two short arcs spinning the other direction.
    ctx.strokeStyle = `rgba(${accent.main}, 0.55)`;
    ctx.lineWidth = 1.5;
    const arcLen = 0.35;
    for (const sign of [1, -1]) {
      const start = time * 0.6 * sign;
      ctx.beginPath();
      ctx.arc(cx, cy, HUD_R + 12, start, start + arcLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, HUD_R + 12, start + Math.PI, start + Math.PI + arcLen);
      ctx.stroke();
    }
  }

  function frame() {
    const time = (performance.now() - t0) / 1000;
    const accent = palette();
    const cx = SIZE / 2, cy = SIZE / 2;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // Soft background haze inside the HUD ring.
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, HUD_R);
    bg.addColorStop(0, `rgba(${accent.main}, 0.07)`);
    bg.addColorStop(1, `rgba(${accent.main}, 0)`);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, cy, HUD_R, 0, Math.PI * 2);
    ctx.fill();

    drawHud(cx, cy, time, accent);

    // Each orbit's twist precesses slowly so the whole thing feels alive.
    orbits.forEach((o, i) => {
      const dynamicTwist = o.twist + time * 0.06 * (i % 2 ? 1 : -1);
      drawOrbit(cx, cy, o, time, dynamicTwist, accent);
    });

    drawNucleus(cx, cy, time, accent);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
