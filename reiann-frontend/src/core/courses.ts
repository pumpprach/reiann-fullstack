import { termOrder } from "./grades";
import type { Course, CourseRecord, TermId } from "./types";

/**
 * Where a student stands with one course (frontend-flows §4.6, §4.6b).
 *  - passed       some attempt has a passing grade
 *  - in-progress  enrolled this term, no grade yet
 *  - can-take     every prerequisite passed (or the course has none)
 *  - waiting      a prerequisite is still in progress
 *  - blocked      a prerequisite is not passed and not in progress
 *  - unknown      no prerequisite data — never show this as "can take"
 */
export type CourseStatus = "passed" | "in-progress" | "can-take" | "waiting" | "blocked" | "unknown";

const FAILING = new Set(["F", "U", "W", "I"]);

/**
 * Codes passed and codes in progress. A course counts as passed when any
 * attempt passed; it is in progress when it has an ungraded record in
 * `currentTerm` (an ungraded record from an earlier term is an unreadable
 * grade, not a course in progress).
 */
export function progressSets(records: CourseRecord[], currentTerm: TermId) {
  const passed = new Set<string>();
  const inProgress = new Set<string>();
  const latest = new Map<string, CourseRecord>();
  for (const r of records) {
    const prev = latest.get(r.code);
    if (!prev || termOrder(r.term) >= termOrder(prev.term)) latest.set(r.code, r);
    if (r.grade !== null && !FAILING.has(r.grade)) passed.add(r.code);
  }
  for (const r of latest.values()) if (r.grade === null && r.term === currentTerm) inProgress.add(r.code);
  for (const c of inProgress) passed.delete(c);
  return { passed, inProgress };
}

/**
 * @param prereqs codes that must be passed first; `undefined` = no data.
 */
export function courseStatus(
  code: string,
  prereqs: readonly string[] | undefined,
  sets: ReturnType<typeof progressSets>,
): CourseStatus {
  if (sets.passed.has(code)) return "passed";
  if (sets.inProgress.has(code)) return "in-progress";
  if (prereqs === undefined) return "unknown";
  const missing = prereqs.filter((p) => !sets.passed.has(p));
  if (missing.length === 0) return "can-take";
  return missing.every((p) => sets.inProgress.has(p)) ? "waiting" : "blocked";
}

/** Prerequisites that are not passed yet. */
export function missingPrereqs(prereqs: readonly string[] | undefined, sets: ReturnType<typeof progressSets>) {
  return (prereqs ?? []).filter((p) => !sets.passed.has(p));
}

/** Courses that list `code` as a prerequisite. */
export function unlocks(code: string, prereqMap: Readonly<Record<string, readonly string[]>>) {
  return Object.entries(prereqMap)
    .filter(([, list]) => list.includes(code))
    .map(([c]) => c)
    .sort();
}

/** "3(2-3-6)" → lecture/lab/self-study hours. Null when the pattern is missing or odd. */
export function parseCreditPattern(pattern: string | undefined) {
  const m = pattern?.match(/^(\d+)\((\d+)-(\d+)-(\d+)\)$/);
  if (!m) return null;
  return { credits: Number(m[1]), lecture: Number(m[2]), lab: Number(m[3]), self: Number(m[4]) };
}

/** Case-insensitive match on code, English and Thai names. Empty query matches all. */
export function matchesQuery(course: Pick<Course, "code" | "nameEn" | "nameTh">, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${course.code} ${course.nameEn} ${course.nameTh}`.toLowerCase().includes(q);
}
