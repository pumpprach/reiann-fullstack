import type { LetterGrade } from "./types";

export interface ScoreCategory {
  id: string;
  name: string;
  /** Percent of the total grade. */
  weight: number;
  /** Raw score; null = not known yet (e.g. final exam not taken). */
  score: number | null;
  max: number;
}

/** Minimum total (out of 100) for each grade. */
export type Cutoffs = Record<LetterGrade, number>;

/** Common fixed cutoffs. Courses differ, so the user can edit these. */
export const DEFAULT_CUTOFFS: Cutoffs = {
  A: 80,
  "B+": 75,
  B: 70,
  "C+": 65,
  C: 60,
  "D+": 55,
  D: 50,
  F: 0,
};

/** A common score split, for when the student has no syllabus to copy from. */
export const BASIC_SCORE_PLAN = [
  { id: "hw", name: "การบ้าน", weight: 10 },
  { id: "proj", name: "โปรเจกต์", weight: 10 },
  { id: "quiz", name: "ควิซ", weight: 10 },
  { id: "mid", name: "สอบกลางภาค", weight: 30 },
  { id: "final", name: "สอบปลายภาค", weight: 40 },
] as const;

export type ScoreIssue = "over-max" | "negative" | "not-number" | "bad-max";

export function scoreIssue(c: ScoreCategory): ScoreIssue | null {
  if (!Number.isFinite(c.max) || c.max <= 0) return "bad-max";
  if (c.score === null) return null;
  if (!Number.isFinite(c.score)) return "not-number";
  if (c.score < 0) return "negative";
  if (c.score > c.max) return "over-max";
  return null;
}

export interface CalcSummary {
  weightTotal: number;
  /** True when weights add up to exactly 100. */
  weightsComplete: boolean;
  /** Points already collected (out of 100), from valid known scores. */
  collected: number;
  /** Weight of categories that are still pending. */
  pendingWeight: number;
  /** Weight of categories with a known score. */
  knownWeight: number;
  maxPossible: number;
}

export function summarizeScores(categories: ScoreCategory[]): CalcSummary {
  let weightTotal = 0;
  let collected = 0;
  let pendingWeight = 0;
  let knownWeight = 0;
  for (const c of categories) {
    weightTotal += c.weight;
    if (c.score === null || scoreIssue(c) !== null) {
      pendingWeight += c.weight;
    } else {
      collected += (c.score / c.max) * c.weight;
      knownWeight += c.weight;
    }
  }
  return {
    weightTotal,
    weightsComplete: Math.abs(weightTotal - 100) < 1e-9,
    collected,
    pendingWeight,
    knownWeight,
    maxPossible: collected + pendingWeight,
  };
}

export type TargetResult =
  | { status: "incomplete-weights" }
  | { status: "nothing-pending"; achieved: boolean }
  | { status: "guaranteed" }
  | { status: "impossible"; maxPossible: number }
  | {
      status: "needed";
      /** Share (0–1) of the pending categories the user must score. */
      fraction: number;
      /** Points out of 100 still needed. */
      points: number;
    };

/** What the pending categories (usually the final) must reach for `grade`. */
export function requiredForGrade(
  categories: ScoreCategory[],
  grade: LetterGrade,
  cutoffs: Cutoffs = DEFAULT_CUTOFFS,
): TargetResult {
  const s = summarizeScores(categories);
  if (!s.weightsComplete) return { status: "incomplete-weights" };
  const need = cutoffs[grade] - s.collected;
  if (s.pendingWeight === 0) {
    return { status: "nothing-pending", achieved: need <= 1e-9 };
  }
  if (need <= 1e-9) return { status: "guaranteed" };
  if (need > s.pendingWeight + 1e-9) {
    return { status: "impossible", maxPossible: s.maxPossible };
  }
  return { status: "needed", fraction: need / s.pendingWeight, points: need };
}

/** Grade for a final total out of 100. */
export function gradeForTotal(
  total: number,
  cutoffs: Cutoffs = DEFAULT_CUTOFFS,
): LetterGrade {
  const order: LetterGrade[] = ["A", "B+", "B", "C+", "C", "D+", "D"];
  for (const g of order) if (total >= cutoffs[g] - 1e-9) return g;
  return "F";
}

/** Best grade still reachable if every pending category is full marks. */
export function bestReachableGrade(
  categories: ScoreCategory[],
  cutoffs: Cutoffs = DEFAULT_CUTOFFS,
): LetterGrade | null {
  const s = summarizeScores(categories);
  if (!s.weightsComplete) return null;
  return gradeForTotal(s.maxPossible, cutoffs);
}

/** S/U courses: pass if the total can still reach the pass mark. */
export function suOutcome(
  categories: ScoreCategory[],
  passMark = 50,
): "passed" | "failed" | "open" {
  const s = summarizeScores(categories);
  if (s.collected >= passMark) return "passed";
  if (s.maxPossible < passMark) return "failed";
  return "open";
}

/** Returns a copy of `items` with the item at `from` moved to index `to` (clamped). */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length) return next;
  const target = Math.max(0, Math.min(next.length - 1, to));
  if (target === from) return next;
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}
