export interface CyberpunkBoidsOptions {
  boidCount?: number;
  idleTimeoutMs?: number;  // Time before wind-down starts
  fadeDownMs?: number;     // How long the total fade out takes (5s)
  wakeUpMs?: number;       // How fast they wake back up (1s)
  debug?: boolean;         // Show FPS and render state
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

// Tiny smooth noise
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
  return a + (b - a) * smoothstep(f);
};

class Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;

  private r: number;
  private a0: number;
  private color: string;

  private angle: number;
  private orbitR: number;
  private orbitTargetR: number;
  private angVel: number;
  private angTargetVel: number;
  private seed: number;

  constructor(private sys: CyberpunkBoids, idx: number) {
    const { width, height } = sys;

    this.x = Math.random() * width;
    this.y = Math.random() * height;

    const a = Math.random() * TAU;
    const sp = 0.6 + Math.random() * 0.9;
    this.vx = Math.cos(a) * sp;
    this.vy = Math.sin(a) * sp;

    this.r = 1.1 + Math.random() * 1.2;
    this.a0 = 0.16 + Math.random() * 0.18;
    this.seed = idx + Math.random() * 1000;

    const b = 180 + Math.floor((Math.random() - 0.5) * 30);
    const g = 220 + Math.floor((Math.random() - 0.5) * 25);
    const r = 60 + Math.floor((Math.random() - 0.5) * 20);
    this.color = `rgba(${r},${g},${b},`;

    this.angle = Math.random() * TAU;
    this.orbitR = 40 + Math.random() * 50;
    this.orbitTargetR = this.orbitR;
    this.angVel = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1);
    this.angTargetVel = this.angVel;
  }

  update(dt: number, timeMs: number): void {
    const s = this.sys;
    const m = s.mouse;

    const dtn = clamp(dt / 16.67, 0.1, 15.0);
    const t = timeMs * 0.001;

    this.vx += (Math.random() - 0.5) * 0.03 * dtn;
    this.vy += (Math.random() - 0.5) * 0.03 * dtn;

    if (m.isInside) {
      const d = dist(this.x, this.y, m.x, m.y);

      if (m.velocity > 3 && d < 150) {
        const ang = Math.atan2(this.y - m.y, this.x - m.x);
        this.vx += Math.cos(ang) * 0.28 * dtn;
        this.vy += Math.sin(ang) * 0.28 * dtn;
      } else if (m.idleTimeMs > 900 && d < 220) {
        const n1 = noise1(t * 0.28, this.seed);
        const n2 = noise1(t * 0.18 + 10.0, this.seed);
        const n3 = noise1(t * 0.12 + 20.0, this.seed);

        this.angTargetVel = (n1 - 0.5) * 0.9;
        this.orbitTargetR = 35 + n2 * 85;

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

    const { width, height } = s;
    if (this.x < -10) this.x += width + 20;
    if (this.x > width + 10) this.x -= width + 20;
    if (this.y < -10) this.y += height + 20;
    if (this.y > height + 10) this.y -= height + 20;
  }

  draw(ctx: CanvasRenderingContext2D, timeMs: number, globalVis: number, idx: number, total: number): void {
    // === Sliding Window Math ===
    // Creates a 20% width 'window' that slides from index 0 to max index
    const w = 0.2; 
    const t = total > 1 ? idx / (total - 1) : 0;
    const start = 1.0 - t * (1.0 - w);
    const end = start - w;
    
    // Calculate the opacity multiplier specifically for this boid
    const visMult = clamp((globalVis - end) / w, 0.0, 1.0);

    // If fully invisible, save GPU effort and skip drawing entirely!
    if (visMult <= 0.0) return;

    const shimmer = Math.sin(timeMs * 0.002 + this.seed) * 0.04;
    const baseAlpha = clamp(this.a0 + shimmer, 0.08, 0.40);
    const finalAlpha = baseAlpha * visMult;

    ctx.fillStyle = this.color + finalAlpha.toFixed(3) + ")";
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

  private boids: Boid[] =[];
  private raf: number | null = null;
  private timeMs = 0;

  // --- Wind Down State ---
  private lastRenderTime = performance.now();
  private lastInteractionTime = performance.now();
  private idleTimeoutMs: number;
  private fadeDownMs: number;
  private wakeUpMs: number;
  
  // 1.0 = fully alive. 0.0 = completely paused.
  private globalVisibility: number = 1.0; 
  
  private debug: boolean;
  private currentFps: number = 60; 

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

  constructor(opts: CyberpunkBoidsOptions = {}) {
    this.boidCount = Math.max(0, Math.floor(opts.boidCount ?? 100));
    this.idleTimeoutMs = opts.idleTimeoutMs ?? 5000;
    this.fadeDownMs = opts.fadeDownMs ?? 3000;
    this.wakeUpMs = opts.wakeUpMs ?? 750;
    this.debug = opts.debug ?? false;
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

    this.lastRenderTime = performance.now();
    this.lastInteractionTime = performance.now();
    this.raf = requestAnimationFrame(this._animate);
  }

  destroy(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;

    this._removeListeners();

    if (this.canvas?.parentElement) this.canvas.parentElement.removeChild(this.canvas);
    this.canvas = null;
    this.ctx = null;
    this.boids =[];
  }

  // ---- Internals & Arrow Functions ----

  private _setBoids(n: number): void {
    this.boids =[];
    for (let i = 0; i < n; i++) this.boids.push(new Boid(this, i));
  }

  private _resize = (): void => {
    if (!this.canvas) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);

    const ctx = this.ctx;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private _animate = (now: number): void => {
    // 1. Prevent negative time differences when waking up from sleep
    const timeSinceLastRender = Math.max(0, now - this.lastRenderTime);
    
    const timeSinceInteraction = now - this.lastInteractionTime;
    const isIdle = timeSinceInteraction > this.idleTimeoutMs;

    if (timeSinceLastRender > 0) {
      const instantFps = 1000 / timeSinceLastRender;
      this.currentFps = this.currentFps * 0.9 + instantFps * 0.1;
    }

    const dt = Math.min(timeSinceLastRender, 250);
    this.lastRenderTime = now;
    this.timeMs += dt;

    // --- Visibility Logic ---
    this.globalVisibility += dt / (isIdle ? -this.fadeDownMs : this.wakeUpMs);
    this.globalVisibility = clamp(this.globalVisibility, 0.0, 1.0);

    if (this.mouse.isInside) {
      this.mouse.idleTimeMs = now - this.mouse.lastMoveMs;
    }

    this._render(dt, isIdle);

    // --- Halt / Continue Render Loop ---
    // 2. Keep the loop going if we are visible OR if we are actively waking up
    if (this.globalVisibility > 0.0 || !isIdle) {
      this.raf = requestAnimationFrame(this._animate);
    } else {
      // 0% CPU footprint. Everything stops. Will resume via _markActive.
      this.raf = null; 
    }
  }

  private _render(dt: number, isIdle: boolean): void {
    const ctx = this.ctx;
    if (!ctx) return;

    // Background fill
    ctx.fillStyle = "oklch(0.1329 0.0132 255.5)";
    ctx.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.boids.length; i++) {
      this.boids[i].update(dt, this.timeMs);
      this.boids[i].draw(ctx, this.timeMs, this.globalVisibility, i, this.boids.length);
    }

    // --- Debug Overlay ---
    if (this.debug) {
      ctx.fillStyle = "rgba(0, 255, 255, 0.85)"; 
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      
      const fpsDisplay = Math.round(this.currentFps).toString().padStart(2, "0");
      let stateDisplay = "ACTIVE";
      if (this.globalVisibility === 0.0) stateDisplay = "SLEEPING (0% CPU)";
      else if (isIdle) stateDisplay = `FADING OUT (${(this.globalVisibility * 100).toFixed(0)}%)`;
      else if (this.globalVisibility < 1.0) stateDisplay = `WAKING UP (${(this.globalVisibility * 100).toFixed(0)}%)`;
      
      ctx.fillText(`FPS: ${fpsDisplay} | ${stateDisplay}`, 16, 80);
    }
  }

  private _addListeners(): void {
    const opts = { passive: true };
    window.addEventListener("resize", this._resize, opts);
    window.addEventListener("pointermove", this._onMove, opts);
    window.addEventListener("pointerdown", this._markActive, opts);
    window.addEventListener("keydown", this._markActive, opts);
    window.addEventListener("wheel", this._markActive, opts);
    document.addEventListener("pointerenter", this._onEnter, opts);
    document.addEventListener("pointerleave", this._onLeave, opts);
  }

  private _removeListeners(): void {
    window.removeEventListener("resize", this._resize);
    window.removeEventListener("pointermove", this._onMove);
    window.removeEventListener("pointerdown", this._markActive);
    window.removeEventListener("keydown", this._markActive);
    window.removeEventListener("wheel", this._markActive);
    document.removeEventListener("pointerenter", this._onEnter);
    document.removeEventListener("pointerleave", this._onLeave);
  }

  // Wakes the system up and restarts the loop if it was asleep
  private _markActive = (): void => {
    this.lastInteractionTime = performance.now();
    if (!this.raf) {
      this.lastRenderTime = performance.now(); // Prevent 'dt' from jumping 
      this.raf = requestAnimationFrame(this._animate);
    }
  }

  private _onMove = (e: PointerEvent): void => {
    this._markActive();
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

  private _onEnter = (e: PointerEvent): void => {
    this._markActive();
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

  private _onLeave = (): void => {
    const m = this.mouse;
    m.isInside = false;
    m.velocity = 0;
    m.idleTimeMs = 0;
    m.x = -9999;
    m.y = -9999;
  }
}