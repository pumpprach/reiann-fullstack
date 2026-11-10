import type { CourseRecord, Grade, LetterGrade, TermId } from "./types";

export const GRADE_POINTS: Record<LetterGrade, number> = {
  A: 4,
  "B+": 3.5,
  B: 3,
  "C+": 2.5,
  C: 2,
  "D+": 1.5,
  D: 1,
  F: 0,
};

export const LETTER_GRADES = Object.keys(GRADE_POINTS) as LetterGrade[];

export function isLetterGrade(grade: Grade | null): grade is LetterGrade {
  return grade !== null && grade in GRADE_POINTS;
}

/** Earns credits: any letter grade except F, plus P and S. */
export function earnsCredits(grade: Grade | null): boolean {
  if (grade === null) return false;
  if (isLetterGrade(grade)) return grade !== "F";
  return grade === "P" || grade === "S";
}

export function termOrder(term: TermId): number {
  const [year, sem] = term.split("/").map(Number);
  return year * 10 + sem;
}

/**
 * Keeps only the latest attempt of each course (retakes use the most recent
 * grade; earlier attempts stay as history and are not counted again).
 * Attempts without a grade yet are ignored so an in-progress retake does not
 * hide the earlier result.
 */
export function latestAttempts(records: CourseRecord[]): CourseRecord[] {
  const byCode = new Map<string, CourseRecord>();
  for (const r of records) {
    if (r.grade === null) continue;
    const prev = byCode.get(r.code);
    if (!prev || termOrder(r.term) > termOrder(prev.term)) byCode.set(r.code, r);
  }
  return [...byCode.values()];
}

/** Earlier attempts that a later attempt replaced (shown struck through). */
export function supersededAttempts(records: CourseRecord[]): CourseRecord[] {
  const latest = new Set(latestAttempts(records));
  return records.filter((r) => r.grade !== null && !latest.has(r));
}

export interface GpaSummary {
  /** Full-precision value; use formatGpa() for display. */
  gpa: number | null;
  gpaCredits: number;
  gradePoints: number;
  earnedCredits: number;
}

export function summarize(records: CourseRecord[]): GpaSummary {
  let gradePoints = 0;
  let gpaCredits = 0;
  let earnedCredits = 0;
  for (const r of latestAttempts(records)) {
    if (isLetterGrade(r.grade)) {
      gradePoints += GRADE_POINTS[r.grade] * r.credits;
      gpaCredits += r.credits;
    }
    if (earnsCredits(r.grade)) earnedCredits += r.credits;
  }
  return {
    gpa: gpaCredits > 0 ? gradePoints / gpaCredits : null,
    gpaCredits,
    gradePoints,
    earnedCredits,
  };
}

/** GPA of one term only (no retake folding across terms). */
export function termGpa(records: CourseRecord[], term: TermId): number | null {
  return summarize(records.filter((r) => r.term === term)).gpa;
}

/**
 * GPAX is shown with 2 decimals, truncated (not rounded):
 * 3.5789 → "3.57".
 */
export function formatGpa(gpa: number | null): string {
  if (gpa === null) return "–";
  const truncated = Math.floor(gpa * 100 + 1e-9) / 100;
  return truncated.toFixed(2);
}

/** GPAX if a course with `credits` gets `grade` on top of the current summary. */
export function projectGpax(
  summary: GpaSummary,
  grade: LetterGrade,
  credits: number,
): number {
  const points = summary.gradePoints + GRADE_POINTS[grade] * credits;
  return points / (summary.gpaCredits + credits);
}
