// Laser highlighter (active during presentation mode): draw fading red strokes
// over the editor, Excalidraw-style — points decay after a fixed lifetime,
// tapering the tail.

const POINT_LIFETIME_MS = 1600;
const BASE_WIDTH = 5;
const COLOR = "255, 59, 48"; // red

type Point = { x: number; y: number; t: number };

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D;
let strokes: Point[][] = [];
let drawing = false;
let raf = 0;
let active = false;

export function enableLaser() {
  if (active) return;
  active = true;
  canvas = document.createElement("canvas");
  canvas.className = "laser-canvas";
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d")!;
  resize();
  window.addEventListener("resize", resize);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  raf = requestAnimationFrame(render);
}

export function disableLaser() {
  if (!active) return;
  active = false;
  drawing = false;
  strokes = [];
  cancelAnimationFrame(raf);
  window.removeEventListener("resize", resize);
  canvas?.remove();
  canvas = null;
}

function resize() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function onDown(e: PointerEvent) {
  // Keep focus on the editor so arrow-key slide navigation still works
  e.preventDefault();
  drawing = true;
  strokes.push([{ x: e.clientX, y: e.clientY, t: performance.now() }]);
  try {
    canvas!.setPointerCapture(e.pointerId);
  } catch {}
}

function onMove(e: PointerEvent) {
  if (!drawing) return;
  strokes[strokes.length - 1].push({ x: e.clientX, y: e.clientY, t: performance.now() });
}

function onUp() {
  drawing = false;
}

function render() {
  if (!canvas) return;
  const now = performance.now();

  // Drop dead points from the tail; keep the head alive while drawing
  strokes = strokes
    .map((stroke, i) => {
      const isCurrent = drawing && i === strokes.length - 1;
      const alive = stroke.filter((p) => now - p.t < POINT_LIFETIME_MS);
      // Keep at least the last point of the active stroke so a held-still
      // pointer still shows a dot
      if (isCurrent && alive.length === 0 && stroke.length > 0) {
        const last = stroke[stroke.length - 1];
        last.t = now;
        return [last];
      }
      return alive;
    })
    .filter((s) => s.length > 0);

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.shadowColor = `rgba(${COLOR}, 0.8)`;
  ctx.shadowBlur = 8;
  ctx.fillStyle = `rgb(${COLOR})`;

  // Each stroke is a single filled ribbon (width tapers with point age) so no
  // pixel is painted twice — per-segment strokes left bright dots where round
  // caps and shadows overlapped.
  for (const stroke of strokes) {
    const head = stroke[stroke.length - 1];
    ctx.beginPath();
    if (stroke.length > 1) {
      const left: number[][] = [];
      const right: number[][] = [];
      for (let i = 0; i < stroke.length; i++) {
        const p = stroke[i];
        const a = stroke[i - 1] ?? p;
        const b = stroke[i + 1] ?? p;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
        const w = halfWidth(now, p);
        left.push([p.x - dy * w, p.y + dx * w]);
        right.push([p.x + dy * w, p.y - dx * w]);
      }
      ctx.moveTo(left[0][0], left[0][1]);
      for (const [x, y] of left) ctx.lineTo(x, y);
      for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
      ctx.closePath();
    }
    // Round head cap (same fill pass, so the overlap doesn't double-paint)
    ctx.moveTo(head.x, head.y);
    ctx.arc(head.x, head.y, halfWidth(now, head), 0, Math.PI * 2);
    ctx.fill();
  }

  raf = requestAnimationFrame(render);
}

// Half-width of the ribbon at a point: fresh → BASE_WIDTH/2, expiring → ~0
function halfWidth(now: number, p: Point) {
  const life = Math.max(0, 1 - (now - p.t) / POINT_LIFETIME_MS);
  return (BASE_WIDTH / 2) * (0.15 + 0.85 * life);
}
