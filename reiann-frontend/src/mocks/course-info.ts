import type { TermId } from "@/core/types";

/**
 * Sample prerequisite and study-plan data for the CS 2565 demo.
 * Written by hand from the curriculum; check against the official
 * document before the real seed is made.
 */

/**
 * Courses that must be passed first. `[]` = no prerequisite.
 * A code missing from this map has no data yet ("ไม่พบเงื่อนไข").
 */
export const PREREQS: Record<string, string[]> = {
  "01418111": [],
  "01418112": [],
  "01418113": ["01418112"],
  "01418132": [],
  "01418141": [],
  "01418211": ["01418113"],
  "01418221": ["01418113"],
  "01418231": ["01418113"],
  "01418232": ["01418231"],
  "01418233": ["01418132"],
  "01418235": ["01418113"],
  "01418236": ["01418233"],
  "01418321": ["01418221"],
  "01418331": ["01418132"],
  "01418332": ["01418236"],
  "01418351": ["01418236"],
  "01418363": ["01418231"],
  "01418371": ["01418221"],
  "01418390": [],
  "01418490": ["01418390"],
  "01418497": [],
  "01418499": ["01418221"],
  "01418223": ["01418113"],
  "01418322": ["01418113"],
  "01418362": ["01418231"],
  "01417111": [],
  "01417112": ["01417111"],
  "01417322": [],
  "01999111": [],
};

/** Planned term for each curriculum course: [year of study, semester]. */
export const PLAN_TERM: Record<string, [number, 1 | 2]> = {
  "01418111": [1, 1],
  "01418112": [1, 1],
  "01417111": [1, 1],
  "01418141": [1, 1],
  "01999111": [1, 1],
  "01418113": [1, 2],
  "01418132": [1, 2],
  "01417112": [1, 2],
  "01417322": [1, 2],
  "01418211": [2, 1],
  "01418231": [2, 1],
  "01418233": [2, 1],
  "01418221": [2, 2],
  "01418232": [2, 2],
  "01418236": [2, 2],
  "01418261": [2, 2],
  "01418321": [3, 1],
  "01418331": [3, 1],
  "01418351": [3, 1],
  "01418390": [3, 1],
  "01418332": [3, 2],
  "01418371": [3, 2],
  "01418497": [3, 2],
  "01418490": [4, 1],
  "01418499": [4, 2],
};

/** Year-of-study terms of this demo student (year 2 now). */
export const STUDENT_TERMS: Record<string, TermId> = {
  "1-1": "2568/1",
  "1-2": "2568/2",
  "2-1": "2569/1",
  "2-2": "2569/2",
  "3-1": "2570/1",
  "3-2": "2570/2",
  "4-1": "2571/1",
  "4-2": "2571/2",
};

export type SlotLabel = "slotElective" | "slotLanguage" | "slotGeneral" | "slotFree";

/** Empty slots the plan leaves for the student to choose. */
export const PLAN_SLOTS: { id: string; year: number; sem: 1 | 2; category: "elective" | "general" | "free"; labelKey: SlotLabel }[] = [
  { id: "s22e", year: 2, sem: 2, category: "elective", labelKey: "slotElective" },
  { id: "s22l", year: 2, sem: 2, category: "general", labelKey: "slotLanguage" },
  { id: "s31e", year: 3, sem: 1, category: "elective", labelKey: "slotElective" },
  { id: "s32e", year: 3, sem: 2, category: "elective", labelKey: "slotElective" },
  { id: "s32g", year: 3, sem: 2, category: "general", labelKey: "slotGeneral" },
  { id: "s42e", year: 4, sem: 2, category: "elective", labelKey: "slotElective" },
  { id: "s42f", year: 4, sem: 2, category: "free", labelKey: "slotFree" },
];

/** Normal load per regular semester (registration rules). Over the max is a warning, not a block. */
export const TERM_CREDIT_RANGE = { min: 9, max: 22 };

/** Sample section times for non-GE courses (no official timetable yet). */
export const SAMPLE_SECTIONS: Record<string, { no: string; kind: "lecture" | "lab"; day: number; start: string; end: string }[]> = {
  "01418221": [
    { no: "800", kind: "lecture", day: 0, start: "09:00", end: "12:00" },
    { no: "801", kind: "lecture", day: 2, start: "13:00", end: "16:00" },
  ],
  "01418232": [
    { no: "800", kind: "lecture", day: 2, start: "13:00", end: "16:00" },
  ],
  "01418236": [
    { no: "800", kind: "lecture", day: 1, start: "09:00", end: "12:00" },
  ],
};

/** Sample review summary shown with a "ตัวอย่าง" tag. */
export const SAMPLE_REVIEW = { overall: 4.1, count: 9, difficulty: 3.4, workload: 3.6, worth: 4.5 };
