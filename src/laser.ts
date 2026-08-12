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
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = `rgba(${COLOR}, 0.8)`;
  ctx.shadowBlur = 8;

  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i++) {
      const p = stroke[i];
      // 1 → fresh, 0 → about to disappear; linear fade, gentle width taper
      const life = 1 - (now - p.t) / POINT_LIFETIME_MS;
      ctx.strokeStyle = `rgba(${COLOR}, ${life})`;
      ctx.lineWidth = BASE_WIDTH * (0.35 + 0.65 * life);
      ctx.beginPath();
      ctx.moveTo(stroke[i - 1].x, stroke[i - 1].y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    // Bright head dot on the freshest point
    const head = stroke[stroke.length - 1];
    if (now - head.t < 100) {
      ctx.fillStyle = `rgba(${COLOR}, 1)`;
      ctx.beginPath();
      ctx.arc(head.x, head.y, BASE_WIDTH * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  raf = requestAnimationFrame(render);
}
