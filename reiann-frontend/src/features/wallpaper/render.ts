import { hourRange, toMinutes, type ClassSlot } from "@/core/schedule";
import type { CreditCategory } from "@/core/types";

/**
 * Draws the timetable wallpaper on a canvas, entirely on the device.
 * Figma: section "4b", frames Wallpaper / Phone · Tablet · Desktop.
 */

export type WallpaperSize = "phone" | "tablet" | "desktop";
export type WallpaperOrientation = "portrait" | "landscape";
export type WallpaperTheme = "matcha" | "strawberry" | "light" | "dark";

interface Frame {
  /** Logical size in CSS px; the saved PNG is w×scale by h×scale. */
  w: number;
  h: number;
  scale: number;
  /** Space kept free at the top for the lock-screen clock (0 = none). */
  clock: number;
  /** Space kept free at the bottom (home indicator, lock-screen buttons, dock). */
  bottom: number;
  /** Left/right margin around the card. */
  margin: number;
  /** Text and spacing multiplier. */
  k: number;
  /** Tallest a day row may get, so a short week does not stretch into huge blocks. */
  maxRow: number;
}

const FRAMES: Record<string, Frame> = {
  "phone-portrait": { w: 390, h: 844, scale: 3, clock: 300, bottom: 110, margin: 16, k: 1, maxRow: 96 },
  "tablet-portrait": { w: 1024, h: 1366, scale: 2, clock: 400, bottom: 72, margin: 40, k: 1.5, maxRow: 170 },
  "tablet-landscape": { w: 1366, h: 1024, scale: 2, clock: 300, bottom: 64, margin: 56, k: 1.5, maxRow: 130 },
  "desktop-landscape": { w: 1280, h: 720, scale: 2, clock: 0, bottom: 72, margin: 64, k: 1.2, maxRow: 110 },
};

/** Phones are always portrait and computers always landscape; only tablets can choose. */
export function frameFor(size: WallpaperSize, orientation: WallpaperOrientation): Frame {
  const o = size === "tablet" ? orientation : size === "phone" ? "portrait" : "landscape";
  return FRAMES[`${size}-${o}`];
}

export const pixelSize = (size: WallpaperSize, orientation: WallpaperOrientation = "portrait") => {
  const f = frameFor(size, orientation);
  return { w: f.w * f.scale, h: f.h * f.scale };
};

interface Palette {
  bg: string;
  card: string;
  text: string;
  muted: string;
  line: string;
  blocks: Record<"required" | "elective" | "general", { fill: string; stroke: string }>;
}

const LIGHT_BLOCKS = {
  required: { fill: "#eaf0e4", stroke: "#547b5b" },
  elective: { fill: "#f1edf8", stroke: "#a99bcf" },
  general: { fill: "#fbf1d9", stroke: "#a8792f" },
};

export const THEMES: Record<WallpaperTheme, Palette> = {
  matcha: { bg: "#eaf0e4", card: "#ffffff", text: "#423c37", muted: "#91867c", line: "#e8e0d8", blocks: LIGHT_BLOCKS },
  strawberry: { bg: "#fdf0ec", card: "#ffffff", text: "#423c37", muted: "#91867c", line: "#e8e0d8", blocks: LIGHT_BLOCKS },
  light: { bg: "#fff9f3", card: "#ffffff", text: "#423c37", muted: "#91867c", line: "#e8e0d8", blocks: LIGHT_BLOCKS },
  dark: {
    bg: "#201f1e",
    card: "#2a2928",
    text: "#f8f3eb",
    muted: "#93908c",
    line: "#474543",
    blocks: {
      required: { fill: "#3a443b", stroke: "#91ac83" },
      elective: { fill: "#3b3646", stroke: "#b9a9df" },
      general: { fill: "#4a402c", stroke: "#e5bb70" },
    },
  },
};

export interface WallpaperOptions {
  size: WallpaperSize;
  orientation: WallpaperOrientation;
  theme: WallpaperTheme;
  showCode: boolean;
  showName: boolean;
  showRoom: boolean;
  hideWeekend: boolean;
  trimHours: boolean;
  clockSpace: boolean;
}

export interface WallpaperInput {
  slots: ClassSlot[];
  title: string;
  dayShort: string[];
  courseName: (code: string) => string;
  category: (code: string) => CreditCategory | undefined;
  fontFamily: string;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * Draws at logical size × `scale` (pass a smaller scale for previews).
 * The card fills the width and the space between the clock area and the bottom
 * margin; rows share that height up to `maxRow`, then the card is centred.
 */
export function drawWallpaper(canvas: HTMLCanvasElement, input: WallpaperInput, o: WallpaperOptions, scale?: number) {
  const F = frameFor(o.size, o.orientation);
  const sc = scale ?? F.scale;
  const pal = THEMES[o.theme];
  canvas.width = Math.round(F.w * sc);
  canvas.height = Math.round(F.h * sc);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(sc, 0, 0, sc, 0, 0);
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, F.w, F.h);

  const days = o.hideWeekend && !input.slots.some((s) => s.day >= 5) ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6];
  const [h0, h1] = o.trimHours ? hourRange(input.slots, [8, 17]) : [8, 20];
  const hours = h1 - h0;
  const k = F.k;

  const pad = Math.round(16 * k);
  const labelW = Math.round(30 * k);
  const titleH = Math.round(26 * k);
  const hourH = Math.round(22 * k);
  const headerH = pad + titleH + Math.round(4 * k) + hourH;

  const top = o.clockSpace && F.clock ? F.clock : F.margin;
  const avail = F.h - top - F.bottom;
  const rowH = Math.max(36 * k, Math.min(F.maxRow, Math.floor((avail - headerH - pad) / days.length)));
  const cardH = headerH + days.length * rowH + pad;
  const cardW = F.w - F.margin * 2;
  const cardX = F.margin;
  // Top-aligned under the clock; otherwise centred in the free area.
  const cardY = o.clockSpace && F.clock ? top : Math.round(top + Math.max(0, (avail - cardH) / 2));

  const innerW = cardW - pad * 2;
  const trackW = innerW - labelW;
  const hw = trackW / hours;

  ctx.fillStyle = pal.card;
  roundRect(ctx, cardX, cardY, cardW, cardH, 24 * k);
  ctx.fill();

  const font = (weight: number, size: number) => `${weight} ${Math.round(size * k)}px ${input.fontFamily}`;
  ctx.textBaseline = "top";
  ctx.fillStyle = pal.text;
  ctx.font = font(500, 16);
  ctx.fillText(input.title, cardX + pad, cardY + pad);

  const gridX = cardX + pad + labelW;
  let y = cardY + pad + titleH + Math.round(4 * k);
  ctx.font = font(400, 12);
  ctx.fillStyle = pal.muted;
  for (let h = h0; h < h1; h++) ctx.fillText(String(h), gridX + (h - h0) * hw, y);
  y += hourH;

  const lineGap = 4 * k;
  for (const d of days) {
    ctx.fillStyle = pal.line;
    ctx.fillRect(cardX + pad, y, innerW, 1);
    ctx.fillStyle = pal.muted;
    ctx.font = font(500, 13);
    ctx.textBaseline = "middle";
    ctx.fillText(input.dayShort[d], cardX + pad, y + rowH / 2);
    for (const s of input.slots.filter((x) => x.day === d)) {
      const start = toMinutes(s.start) / 60;
      const end = toMinutes(s.end) / 60;
      if (end <= h0 || start >= h1) continue;
      const inset = 2 * k;
      const bx = gridX + (Math.max(start, h0) - h0) * hw + inset;
      const bw = (Math.min(end, h1) - Math.max(start, h0)) * hw - inset * 2;
      const by = y + 4 * k;
      const bh = rowH - 8 * k;
      const cat = input.category(s.courseCode);
      const tone = cat === "elective" ? pal.blocks.elective : cat === "general" || cat === "free" ? pal.blocks.general : pal.blocks.required;
      ctx.fillStyle = tone.fill;
      roundRect(ctx, bx, by, bw, bh, 8 * k);
      ctx.fill();
      ctx.strokeStyle = tone.stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = pal.text;
      ctx.textBaseline = "top";
      // Wider blocks have room for the full code.
      ctx.font = font(600, 12);
      const code = ctx.measureText(s.courseCode).width <= bw - 12 * k ? s.courseCode : s.courseCode.slice(-3);
      const lines: { text: string; weight: number; size: number }[] = [];
      if (o.showCode) lines.push({ text: code, weight: 600, size: 12 });
      if (o.showName) lines.push({ text: input.courseName(s.courseCode), weight: 400, size: 11 });
      if (o.showRoom && s.room) lines.push({ text: s.room, weight: 400, size: 11 });
      let ty = by + 6 * k;
      for (const l of lines) {
        const lh = l.size * k + lineGap;
        if (ty + l.size * k > by + bh - 4 * k) break;
        ctx.font = font(l.weight, l.size);
        ctx.fillText(ellipsize(ctx, l.text, bw - 12 * k), bx + 6 * k, ty);
        ty += lh;
      }
    }
    y += rowH;
  }
}

/** Saves the PNG. iOS cannot download directly, so it uses the share sheet. */
export async function saveCanvas(canvas: HTMLCanvasElement, fileName: string) {
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));
  const file = new File([blob], fileName, { type: "image/png" });
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
