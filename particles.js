/* ============================================================
   Phos — plasma particle engine
   - ImageParticles: particles that swarm into the shape of an
     image and react to the pointer (repel + spring-back).
   - PlasmaField: ambient drifting motes behind the page.
   - plus scroll reveals + nav scroll state.
   Vanilla JS, no dependencies. Built to stay light.
   ============================================================ */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;

  /* one shared soft-glow sprite — far cheaper than per-particle gradients */
  function makeGlowSprite(size) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.85)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }
  const GLOW = makeGlowSprite(64);

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ----------------------------------------------------------
     ImageParticles
     ---------------------------------------------------------- */
  class ImageParticles {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true });
      this.src = canvas.dataset.image;
      this.density = parseFloat(canvas.dataset.density || "2"); // sample step in source px
      this.threshold = parseFloat(canvas.dataset.threshold || "62"); // min luminance to keep
      this.accent = canvas.dataset.accent || "#ff5c93";
      this.particles = [];
      this.pointer = { x: -9999, y: -9999, active: false };
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.running = false;
      this.formed = 0;          // 0 = scattered, 1 = fully formed
      this.visible = false;

      this._onResize = this._debounce(() => this.layout(), 200);
      window.addEventListener("resize", this._onResize);
      this._bindPointer();

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { this.img = img; this.layout(); this._observe(); };
      img.onerror = () => this._fallback();
      img.src = this.src;
    }

    _fallback() {
      const fb = this.canvas.parentElement.querySelector(".particle-fallback");
      if (fb) fb.style.display = "block";
      this.canvas.style.display = "none";
    }

    _debounce(fn, ms) {
      let t;
      return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    }

    /* size the canvas to its CSS box and (re)sample the image into particles */
    layout() {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !this.img) return;
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      this.cssW = w; this.cssH = h;
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this._sample(w, h);
    }

    _sample(w, h) {
      // draw image (object-fit: cover) into an offscreen buffer at a modest
      // resolution, then read pixels and turn the bright ones into particles.
      const SAMPLE = Math.min(260, Math.round(Math.min(w, h)));
      const off = document.createElement("canvas");
      off.width = off.height = SAMPLE;
      const o = off.getContext("2d");

      const iw = this.img.width, ih = this.img.height;
      const scale = Math.max(SAMPLE / iw, SAMPLE / ih);
      const dw = iw * scale, dh = ih * scale;
      o.drawImage(this.img, (SAMPLE - dw) / 2, (SAMPLE - dh) / 2, dw, dh);

      const data = o.getImageData(0, 0, SAMPLE, SAMPLE).data;

      // adaptive step → keeps total particle count sensible on every screen
      const targetMax = w < 520 ? 2600 : 4200;
      let step = Math.max(2, Math.round(this.density));
      let coords;
      for (;;) {
        coords = [];
        for (let y = 0; y < SAMPLE; y += step) {
          for (let x = 0; x < SAMPLE; x += step) {
            const i = (y * SAMPLE + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) * (a / 255);
            if (lum > this.threshold) coords.push({ x, y, r, g, b, lum });
          }
        }
        if (coords.length <= targetMax || step > 8) break;
        step += 1;
      }

      const sx = w / SAMPLE, sy = h / SAMPLE;
      const keepPrev = this.particles.length > 0;
      const next = [];
      for (let k = 0; k < coords.length; k++) {
        const c = coords[k];
        const hx = c.x * sx, hy = c.y * sy;
        const old = keepPrev ? this.particles[k % this.particles.length] : null;
        next.push({
          hx, hy,                                   // home position
          x: old ? old.x : Math.random() * w,       // current
          y: old ? old.y : Math.random() * h,
          vx: 0, vy: 0,
          // colour: lean toward the image but nudge toward the accent on highlights
          r: c.r, g: c.g, b: c.b,
          size: lerp(0.7, 2.0, clamp(c.lum / 255, 0, 1)),
          phase: Math.random() * TAU,
          ease: 0.04 + Math.random() * 0.05,
        });
      }
      this.particles = next;
    }

    _bindPointer() {
      const set = (e, active) => {
        const rect = this.canvas.getBoundingClientRect();
        const pt = e.touches ? e.touches[0] : e;
        this.pointer.x = pt.clientX - rect.left;
        this.pointer.y = pt.clientY - rect.top;
        this.pointer.active = active;
      };
      this.canvas.addEventListener("pointermove", (e) => set(e, true));
      this.canvas.addEventListener("pointerleave", () => { this.pointer.active = false; });
      this.canvas.addEventListener("touchmove", (e) => set(e, true), { passive: true });
      this.canvas.addEventListener("touchend", () => { this.pointer.active = false; });
    }

    _observe() {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          this.visible = en.isIntersecting;
          if (this.visible) this.start(); else this.stop();
        });
      }, { threshold: 0.06 });
      io.observe(this.canvas);
    }

    start() {
      if (this.running) return;
      this.running = true;
      this._tick();
    }
    stop() { this.running = false; }

    _tick() {
      if (!this.running) return;
      this._frame();
      requestAnimationFrame(() => this._tick());
    }

    _frame() {
      const { ctx, particles } = this;
      const w = this.cssW, h = this.cssH;
      ctx.clearRect(0, 0, w, h);

      // ease the whole shape in the first time it's seen
      this.formed = lerp(this.formed, 1, 0.03);
      this.phaseT = (this.phaseT || 0) + 0.012;

      const p = this.pointer;
      const R = Math.max(70, Math.min(w, h) * 0.22); // interaction radius
      const R2 = R * R;

      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];

        // gentle plasma idle wobble
        const wob = reduceMotion ? 0 : 1.1;
        const tx = a.hx + Math.cos(this.phaseT + a.phase) * wob;
        const ty = a.hy + Math.sin(this.phaseT * 0.9 + a.phase) * wob;

        // spring toward home
        a.vx += (tx - a.x) * a.ease;
        a.vy += (ty - a.y) * a.ease;

        // pointer repulsion — particles scatter away from the cursor, then swarm back
        if (p.active) {
          const dx = a.x - p.x, dy = a.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const force = (1 - d / R) * 7.5;
            a.vx += (dx / d) * force;
            a.vy += (dy / d) * force;
          }
        }

        a.vx *= 0.86;          // damping
        a.vy *= 0.86;
        a.x += a.vx;
        a.y += a.vy;

        // displacement boosts glow — the swarm "lights up" where you disturb it
        const disp = Math.min(1, (Math.abs(a.x - a.hx) + Math.abs(a.y - a.hy)) / 60);
        const size = (a.size + disp * 2.2) * (0.5 + 0.5 * this.formed);

        // tint toward accent as particles get energised
        const ar = this._accentRGB || (this._accentRGB = hexToRgb(this.accent));
        const r = Math.round(lerp(a.r, ar.r, disp * 0.7));
        const g = Math.round(lerp(a.g, ar.g, disp * 0.7));
        const b = Math.round(lerp(a.b, ar.b, disp * 0.7));
        const alpha = clamp((0.35 + disp * 0.65) * this.formed, 0, 1);

        ctx.globalAlpha = alpha;
        const s = size * 3.2;
        // colourise the white glow sprite
        ctx.drawImage(GLOW, a.x - s / 2, a.y - s / 2, s, s);
        // a crisp core for definition
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, Math.max(0.4, size * 0.5), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // recolour pass: multiply the accumulated white glow with the particle hues.
      // (kept simple — the per-particle core above already carries colour.)
    }
  }

  /* ----------------------------------------------------------
     PlasmaField — ambient drifting motes behind the page
     ---------------------------------------------------------- */
  class PlasmaField {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.pointer = { x: -9999, y: -9999 };
      this.motes = [];
      this.colors = [
        [255, 92, 147],
        [168, 120, 255],
        [73, 214, 255],
      ];
      this.resize();
      window.addEventListener("resize", this._debounce(() => this.resize(), 200));
      window.addEventListener("pointermove", (e) => {
        this.pointer.x = e.clientX; this.pointer.y = e.clientY;
      });
      this._tick();
    }
    _debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.w = w; this.h = h;
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const count = clamp(Math.round((w * h) / 22000), 28, 90);
      this.motes = [];
      for (let i = 0; i < count; i++) {
        const c = this.colors[i % this.colors.length];
        this.motes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.8 + 0.6,
          c,
          tw: Math.random() * TAU,
        });
      }
    }

    _tick() {
      const { ctx } = this;
      const w = this.w, h = this.h;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const p = this.pointer;

      for (const m of this.motes) {
        // slow drift
        m.x += m.vx; m.y += m.vy;
        m.tw += 0.02;

        // soft drift toward the pointer (the field "leans" to your cursor)
        const dx = p.x - m.x, dy = p.y - m.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 240 * 240 && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = (1 - d / 240) * 0.06;
          m.x += (dx / d) * f * d * 0.02;
          m.y += (dy / d) * f * d * 0.02;
        }

        // wrap around edges
        if (m.x < -20) m.x = w + 20; else if (m.x > w + 20) m.x = -20;
        if (m.y < -20) m.y = h + 20; else if (m.y > h + 20) m.y = -20;

        const tw = 0.5 + 0.5 * Math.sin(m.tw);
        const s = m.r * (4 + tw * 3);
        ctx.globalAlpha = 0.12 + tw * 0.18;
        ctx.drawImage(GLOW, m.x - s / 2, m.y - s / 2, s, s);
        ctx.fillStyle = `rgba(${m.c[0]},${m.c[1]},${m.c[2]},${0.5})`;
        ctx.globalAlpha = 0.25 + tw * 0.25;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      requestAnimationFrame(() => this._tick());
    }
  }

  function hexToRgb(hex) {
    const m = hex.replace("#", "");
    const n = parseInt(m.length === 3 ? m.split("").map((x) => x + x).join("") : m, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  /* ----------------------------------------------------------
     page wiring: reveals + nav scroll state
     ---------------------------------------------------------- */
  function initReveals() {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach((e) => io.observe(e));
  }

  function initNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function init() {
    document.documentElement.classList.remove("no-js");
    const field = document.getElementById("field");
    if (field && !reduceMotion) new PlasmaField(field);
    document.querySelectorAll(".particle-canvas").forEach((c) => new ImageParticles(c));
    initReveals();
    initNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
