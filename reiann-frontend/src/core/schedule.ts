/** Weekly class times. Days: 0 = Monday … 6 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ClassSlot {
  id: string;
  courseCode: string;
  day: Weekday;
  /** "HH:MM" 24-hour */
  start: string;
  end: string;
  kind: "lecture" | "lab";
  room?: string;
  section?: string;
}

export const DAY_START = "07:00";
export const DAY_END = "20:00";

export function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return Number.NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return Number.NaN;
  return h * 60 + min;
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type SlotIssue = "bad-time" | "end-before-start" | "outside-hours";

export function slotIssue(slot: Pick<ClassSlot, "start" | "end">): SlotIssue | null {
  const s = toMinutes(slot.start);
  const e = toMinutes(slot.end);
  if (Number.isNaN(s) || Number.isNaN(e)) return "bad-time";
  if (e <= s) return "end-before-start";
  if (s < toMinutes(DAY_START) || e > toMinutes(DAY_END)) return "outside-hours";
  return null;
}

export function overlaps(a: ClassSlot, b: ClassSlot): boolean {
  if (a.day !== b.day) return false;
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

/** Ids of slots that overlap another slot. Overlaps can be saved but are flagged. */
export function conflictingIds(slots: ClassSlot[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (overlaps(slots[i], slots[j])) {
        ids.add(slots[i].id);
        ids.add(slots[j].id);
      }
    }
  }
  return ids;
}

/** Hour range that covers every slot, used to trim the wallpaper grid. */
export function hourRange(
  slots: Pick<ClassSlot, "start" | "end">[],
  fallback: [number, number] = [8, 20],
): [number, number] {
  if (slots.length === 0) return fallback;
  let lo = 24;
  let hi = 0;
  for (const s of slots) {
    lo = Math.min(lo, Math.floor(toMinutes(s.start) / 60));
    hi = Math.max(hi, Math.ceil(toMinutes(s.end) / 60));
  }
  return [lo, hi];
}
