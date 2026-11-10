/**
 * Study-plan helpers for the curriculum graph, Plan Next Term and What-if.
 * Pure functions: no React, no Next.js.
 */

export type PlanTerm = readonly [year: number, sem: 1 | 2];
export type PrereqMap = Readonly<Record<string, readonly string[]>>;

/** Year 1 first semester = 0, year 4 second semester = 7. */
export const termIndex = ([year, sem]: PlanTerm) => (year - 1) * 2 + (sem - 1);
export const termAt = (i: number): PlanTerm => [Math.floor(i / 2) + 1, ((i % 2) + 1) as 1 | 2];
export const LAST_TERM = 7;

/** Every course that (directly or not) needs `code` first. */
export function descendants(code: string, prereqs: PrereqMap): Set<string> {
  const out = new Set<string>();
  const stack = [code];
  while (stack.length) {
    const c = stack.pop()!;
    for (const [next, list] of Object.entries(prereqs)) {
      if (list.includes(c) && !out.has(next)) {
        out.add(next);
        stack.push(next);
      }
    }
  }
  return out;
}

/** Every course `code` needs first, directly or not. */
export function ancestors(code: string, prereqs: PrereqMap): Set<string> {
  const out = new Set<string>();
  const stack = [code];
  while (stack.length) {
    for (const p of prereqs[stack.pop()!] ?? []) {
      if (!out.has(p)) {
        out.add(p);
        stack.push(p);
      }
    }
  }
  return out;
}

export interface DelayRow {
  code: string;
  /** Planned term index, or null when the course is not in the plan. */
  planned: number | null;
  /** Earliest term index the course can be taken under this scenario. */
  earliest: number;
  /** Terms later than planned (0 = unchanged). */
  shift: number;
}

/**
 * What-if: `code` cannot be passed before term `earliest` (e.g. failed this
 * term → retake next term). Pushes every course that depends on it.
 * Assumes every course opens every term (no offering data yet) and that a
 * course needs its prerequisites passed in an earlier term.
 */
export function simulateDelay(code: string, earliest: number, plan: Readonly<Record<string, PlanTerm>>, prereqs: PrereqMap): DelayRow[] {
  const at = new Map<string, number>([[code, earliest]]);
  const affected = [...descendants(code, prereqs)];
  // Relax until stable; the graph is small and acyclic.
  for (let changed = true; changed; ) {
    changed = false;
    for (const c of affected) {
      const planned = plan[c] ? termIndex(plan[c]) : 0;
      const needs = (prereqs[c] ?? []).map((p) => (at.has(p) ? at.get(p)! + 1 : plan[p] ? termIndex(plan[p]) + 1 : 0));
      const e = Math.max(planned, ...needs);
      if (at.get(c) !== e) {
        at.set(c, e);
        changed = true;
      }
    }
  }
  const rows = [code, ...affected].map((c) => {
    const planned = plan[c] ? termIndex(plan[c]) : null;
    const e = at.get(c)!;
    return { code: c, planned, earliest: e, shift: planned === null ? 0 : Math.max(0, e - planned) };
  });
  return rows.sort((a, b) => (a.planned ?? 99) - (b.planned ?? 99) || a.code.localeCompare(b.code));
}
