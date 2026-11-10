import { describe, expect, it } from "vitest";
import {
  formatGpa,
  latestAttempts,
  projectGpax,
  summarize,
  supersededAttempts,
  termGpa,
} from "./grades";
import type { CourseRecord } from "./types";

const r = (code: string, term: CourseRecord["term"], credits: number, grade: CourseRecord["grade"]): CourseRecord => ({ code, term, credits, grade });

describe("summarize", () => {
  it("weights grade points by credits", () => {
    const s = summarize([r("A1", "2568/1", 3, "A"), r("B1", "2568/1", 2, "C")]);
    expect(s.gpa).toBeCloseTo((4 * 3 + 2 * 2) / 5);
    expect(s.earnedCredits).toBe(5);
  });

  it("uses only the latest attempt of a retaken course", () => {
    const records = [r("X", "2568/1", 3, "F"), r("X", "2568/2", 3, "B"), r("Y", "2568/1", 3, "A")];
    const s = summarize(records);
    expect(s.gpaCredits).toBe(6);
    expect(s.gpa).toBeCloseTo(3.5);
    expect(supersededAttempts(records)).toEqual([records[0]]);
  });

  it("does not let an in-progress retake hide the earlier grade", () => {
    const records = [r("X", "2568/1", 3, "D"), r("X", "2569/1", 3, null)];
    expect(latestAttempts(records)).toEqual([records[0]]);
  });

  it("keeps P/S/U/W/I out of GPAX; P and S still earn credits", () => {
    const s = summarize([
      r("A", "2568/1", 3, "A"),
      r("P", "2568/1", 3, "P"),
      r("S", "2568/1", 1, "S"),
      r("U", "2568/1", 1, "U"),
      r("W", "2568/1", 3, "W"),
      r("I", "2568/1", 3, "I"),
    ]);
    expect(s.gpa).toBe(4);
    expect(s.gpaCredits).toBe(3);
    expect(s.earnedCredits).toBe(7);
  });

  it("F counts in GPAX but earns no credits", () => {
    const s = summarize([r("A", "2568/1", 3, "A"), r("F", "2568/1", 3, "F")]);
    expect(s.gpa).toBe(2);
    expect(s.earnedCredits).toBe(3);
  });

  it("returns null GPA with no graded courses", () => {
    expect(summarize([r("P", "2568/1", 3, "P")]).gpa).toBeNull();
  });
});

describe("formatGpa", () => {
  it("truncates to 2 decimals instead of rounding", () => {
    expect(formatGpa(3.5789)).toBe("3.57");
    expect(formatGpa(3.999)).toBe("3.99");
    expect(formatGpa(4)).toBe("4.00");
    expect(formatGpa(null)).toBe("–");
  });

  it("is not thrown off by floating point error", () => {
    expect(formatGpa(0.29 * 10 / 10)).toBe("0.29");
    expect(formatGpa(3.57)).toBe("3.57");
  });
});

describe("termGpa / projectGpax", () => {
  it("computes a single term", () => {
    const records = [r("A", "2568/1", 3, "A"), r("B", "2568/2", 3, "C")];
    expect(termGpa(records, "2568/2")).toBe(2);
  });

  it("projects GPAX with one more course", () => {
    const s = summarize([r("A", "2568/1", 3, "B")]);
    expect(projectGpax(s, "A", 3)).toBe(3.5);
  });
});
