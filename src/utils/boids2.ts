export interface MinimalBoidsOptions {
  boidCount?: number;
}

type MouseState = {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  velocity: number;
  isInside: boolean;
  idleTimeMs: number;
  lastMoveMs: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);
const TAU = Math.PI * 2;

// Tiny smooth noise (no libs)
const hash1 = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453123;
  return x - Math.floor(x);
};
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const noise1 = (t: number, seed: number) => {
  const x = t + seed * 1000;
  const i0 = Math.floor(x);
  const f = x - i0;
  const a = hash1(i0);
  const b = hash1(i0 + 1);
  return a + (b - a) * smoothstep(f); // 0..1
};

class Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;

  private r: number;
  private a0: number;

  // Precomputed draw style (no HSL conversion per frame)
  private color: string;

  // "curious" orbit state
  private angle: number;
  private orbitR: number;
  private orbitTargetR: number;
  private angVel: number;
  private angTargetVel: number;
  private seed: number;

  constructor(private sys: MinimalBoids, idx: number) {
    const { width, height } = sys;

    this.x = Math.random() * width;
    this.y = Math.random() * height;

    const a = Math.random() * TAU;
    const sp = 0.6 + Math.random() * 0.9;
    this.vx = Math.cos(a) * sp;
    this.vy = Math.sin(a) * sp;

    // Size + alpha
    this.r = 1.1 + Math.random() * 1.2;          // ~1..2.3px
    this.a0 = 0.16 + Math.random() * 0.18;       // base alpha
    this.seed = idx + Math.random() * 1000;

    // Cyber-blue-ish, pre-baked once
    // Using rgba avoids per-frame hsla string building.
    const b = 180 + Math.floor((Math.random() - 0.5) * 30);  // 165..195
    const g = 220 + Math.floor((Math.random() - 0.5) * 25);  // ~208..232
    const r = 60 + Math.floor((Math.random() - 0.5) * 20);   // ~50..70
    this.color = `rgba(${r},${g},${b},`; // alpha appended per draw

    // Orbit
    this.angle = Math.random() * TAU;
    this.orbitR = 40 + Math.random() * 50;
    this.orbitTargetR = this.orbitR;
    this.angVel = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1);
    this.angTargetVel = this.angVel;
  }

  update(dt: number, timeMs: number): void {
    const s = this.sys;
    const m = s.mouse;

    const dtn = clamp(dt / 16.67, 0.25, 2.5);
    const t = timeMs * 0.001;

    // Tiny drift (keeps life even without mouse)
    this.vx += (Math.random() - 0.5) * 0.03 * dtn;
    this.vy += (Math.random() - 0.5) * 0.03 * dtn;

    if (m.isInside) {
      const d = dist(this.x, this.y, m.x, m.y);

      // Fast mouse -> scatter
      if (m.velocity > 3 && d < 150) {
        const ang = Math.atan2(this.y - m.y, this.x - m.x);
        this.vx += Math.cos(ang) * 0.28 * dtn;
        this.vy += Math.sin(ang) * 0.28 * dtn;
      } else if (m.idleTimeMs > 900 && d < 220) {
        // Curious orbit: smooth noise changes speed + radius
        const n1 = noise1(t * 0.28, this.seed);
        const n2 = noise1(t * 0.18 + 10.0, this.seed);
        const n3 = noise1(t * 0.12 + 20.0, this.seed);

        this.angTargetVel = (n1 - 0.5) * 0.9; // -0.45..0.45 rad/s
        this.orbitTargetR = 35 + n2 * 85;     // 35..120 px

        this.angVel += (this.angTargetVel - this.angVel) * 0.015 * dtn;
        this.orbitR += (this.orbitTargetR - this.orbitR) * 0.02 * dtn;

        const wobble = (n3 - 0.5) * 0.25;
        this.angle += (this.angVel + wobble) * (dt * 0.001);

        const tx = m.x + Math.cos(this.angle) * this.orbitR;
        const ty = m.y + Math.sin(this.angle) * this.orbitR;

        this.vx += (tx - this.x) * 0.004 * dtn;
        this.vy += (ty - this.y) * 0.004 * dtn;
      }
    }

    // Damping + speed cap
    const damp = Math.pow(0.92, dtn);
    this.vx *= damp;
    this.vy *= damp;

    const sp = Math.hypot(this.vx, this.vy);
    const max = 2.4;
    if (sp > max) {
      this.vx = (this.vx / sp) * max;
      this.vy = (this.vy / sp) * max;
    }

    this.x += this.vx * dtn;
    this.y += this.vy * dtn;

    // Wrap
    const { width, height } = s;
    if (this.x < -10) this.x += width + 20;
    if (this.x > width + 10) this.x -= width + 20;
    if (this.y < -10) this.y += height + 20;
    if (this.y > height + 10) this.y -= height + 20;
  }

  // Optimized draw:
  // - one arc + one fill
  // - fillStyle string is "rgba(r,g,b," + alpha + ")" (cheap concat)
  // - no gradients, no extra paths
  draw(ctx: CanvasRenderingContext2D, timeMs: number): void {
    const shimmer = Math.sin(timeMs * 0.002 + this.seed) * 0.04;
    const a = clamp(this.a0 + shimmer, 0.08, 0.40);

    ctx.fillStyle = this.color + a.toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, TAU);
    ctx.fill();
  }
}

export default class CyberpunkBoids {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  width = 0;
  height = 0;

  private boids: Boid[] = [];
  private raf: number | null = null;
  private lastMs = 0;
  private timeMs = 0;

  mouse: MouseState = {
    x: -9999,
    y: -9999,
    prevX: -9999,
    prevY: -9999,
    velocity: 0,
    isInside: false,
    idleTimeMs: 0,
    lastMoveMs: performance.now(),
  };

  private boidCount: number;

  constructor(opts: MinimalBoidsOptions = {}) {
    this.boidCount = Math.max(0, Math.floor(opts.boidCount ?? 60));

    this._animate = this._animate.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onEnter = this._onEnter.bind(this);
    this._onLeave = this._onLeave.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  start(container: HTMLElement = document.body): void {
    if (this.canvas) return;

    const c = document.createElement("canvas");
    c.style.position = "fixed";
    c.style.inset = "0";
    c.style.width = "100%";
    c.style.height = "100%";
    c.style.pointerEvents = "none";
    c.style.zIndex = "-1";
    container.appendChild(c);

    this.canvas = c;
    this.ctx = c.getContext("2d");

    this._resize();
    this._setBoids(this.boidCount);
    this._addListeners();

    this.lastMs = performance.now();
    this.raf = requestAnimationFrame(this._animate);
  }

  destroy(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;

    this._removeListeners();

    if (this.canvas?.parentElement) this.canvas.parentElement.removeChild(this.canvas);
    this.canvas = null;
    this.ctx = null;
    this.boids = [];
  }

  // ---- internals ----

  private _setBoids(n: number): void {
    this.boids = [];
    for (let i = 0; i < n; i++) this.boids.push(new Boid(this, i));
  }

  private _resize(): void {
    if (!this.canvas) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // DPR scaling: keep (cheap) and improves crispness; clamp to 2 to avoid huge canvases.
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);

    const ctx = this.ctx;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private _animate(now: number): void {
    const dt = Math.min(50, now - this.lastMs);
    this.lastMs = now;
    this.timeMs += dt;

    if (this.mouse.isInside) this.mouse.idleTimeMs = now - this.mouse.lastMoveMs;

    this._render(dt);
    this.raf = requestAnimationFrame(this._animate);
  }

  private _render(dt: number): void {
    const ctx = this.ctx;
    if (!ctx) return;

    // Background fill (no grid)
    ctx.fillStyle = "oklch(0.1329 0.0132 255.5)";
    ctx.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.boids.length; i++) {
      this.boids[i].update(dt, this.timeMs);
      this.boids[i].draw(ctx, this.timeMs);
    }
  }

  private _addListeners(): void {
    window.addEventListener("resize", this._onResize);
    document.addEventListener("mousemove", this._onMove);
    document.addEventListener("mouseenter", this._onEnter);
    document.addEventListener("mouseleave", this._onLeave);
  }

  private _removeListeners(): void {
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("mousemove", this._onMove);
    document.removeEventListener("mouseenter", this._onEnter);
    document.removeEventListener("mouseleave", this._onLeave);
  }

  private _onResize(): void {
    this._resize();
  }

  private _onMove(e: MouseEvent): void {
    const m = this.mouse;
    m.prevX = m.x;
    m.prevY = m.y;
    m.x = e.clientX;
    m.y = e.clientY;

    const dx = m.x - m.prevX;
    const dy = m.y - m.prevY;
    m.velocity = Math.hypot(dx, dy);

    if (m.velocity > 1.5) m.lastMoveMs = performance.now();
    m.isInside = true;
  }

  private _onEnter(e: MouseEvent): void {
    const m = this.mouse;
    m.isInside = true;
    m.x = e.clientX;
    m.y = e.clientY;
    m.prevX = m.x;
    m.prevY = m.y;
    m.velocity = 0;
    m.lastMoveMs = performance.now();
    m.idleTimeMs = 0;
  }

  private _onLeave(): void {
    const m = this.mouse;
    m.isInside = false;
    m.velocity = 0;
    m.idleTimeMs = 0;
    m.x = -9999;
    m.y = -9999;
  }
}