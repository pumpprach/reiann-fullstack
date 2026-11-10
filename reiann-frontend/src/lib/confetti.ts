/**
 * Small dependency-free confetti. Pieces are plain DOM nodes moved with the Web
 * Animations API, so nothing runs once they land. Decorative only: skipped when
 * the user asks for reduced motion.
 */
const COLORS = ["--color-pop-pink", "--color-pop-mango", "--color-pop-matcha", "--color-pop-sky", "--color-pop-grape"];

// Where the last click landed, so a burst can start under the pointer even when
// the action finishes later or the button has gone (e.g. a dialog that closes).
let last: { x: number; y: number; at: number } | null = null;
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", (e) => (last = { x: e.clientX, y: e.clientY, at: Date.now() }), {
    capture: true,
    passive: true,
  });
}

type Launch = { x: number; y: number; count: number; speed: [number, number]; angle: [number, number]; gravity: number; duration: number };

function shoot({ x, y, count, speed, angle, gravity, duration }: Launch) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const style = getComputedStyle(document.documentElement);
  const colors = COLORS.map((c) => style.getPropertyValue(c).trim());
  const between = ([a, b]: [number, number]) => a + Math.random() * (b - a);

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:70";

  // Attached first so the animations run against live nodes, and removed on a
  // timer so a paused or throttled tab can never leave the layer behind.
  document.body.append(layer);
  window.setTimeout(() => layer.remove(), duration + 100);

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    const size = 6 + Math.random() * 6;
    const round = i % 3 === 0;
    piece.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${round ? size : size * 0.55}px;border-radius:${round ? "50%" : "2px"};background:${colors[i % colors.length]}`;
    layer.append(piece);

    const a = (between(angle) * Math.PI) / 180;
    const v = between(speed);
    const vx = Math.cos(a) * v;
    const vy = Math.sin(a) * v;
    const spin = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540);
    const steps = 10;
    const frames = Array.from({ length: steps + 1 }, (_, s) => {
      const p = s / steps;
      const t = (p * duration) / 1000;
      return {
        transform: `translate(${vx * t}px, ${vy * t + (gravity * t * t) / 2}px) rotate(${spin * p}deg)`,
        opacity: p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1,
      };
    });
    piece.animate(frames, { duration, easing: "linear", fill: "both" });
  }
}

/** A small pop of colour at the last click (or mid-screen after keyboard use). */
export function burst() {
  const recent = last && Date.now() - last.at < 5000;
  shoot({
    x: recent ? last!.x : window.innerWidth / 2,
    y: recent ? last!.y : window.innerHeight / 2,
    count: 26,
    speed: [180, 460],
    angle: [-160, -20],
    gravity: 900,
    duration: 900,
  });
}

/** Full-screen celebration: two cannons from the bottom corners. */
export function celebrate() {
  const h = window.innerHeight;
  const w = window.innerWidth;
  const speed: [number, number] = [h * 0.9, h * 1.7];
  shoot({ x: 0, y: h, count: 70, speed, angle: [-80, -45], gravity: h * 1.25, duration: 2200 });
  shoot({ x: w, y: h, count: 70, speed, angle: [-135, -100], gravity: h * 1.25, duration: 2200 });
}
