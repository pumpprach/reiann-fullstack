import { describe, expect, it } from "vitest";
import { courseStatus, matchesQuery, missingPrereqs, parseCreditPattern, progressSets, unlocks } from "./courses";
import type { CourseRecord } from "./types";

const r = (code: string, term: CourseRecord["term"], grade: CourseRecord["grade"]): CourseRecord => ({ code, term, credits: 3, grade });

const records = [
  r("A", "2568/1", "B+"),
  r("B", "2568/1", "F"),
  r("B", "2568/2", "C"),
  r("C", "2568/2", "F"),
  r("D", "2569/1", null),
  r("E", "2568/1", null), // unreadable grade, not in progress
];
const sets = progressSets(records, "2569/1");

describe("progressSets", () => {
  it("counts a retake that passed and skips failed or ungraded courses", () => {
    expect([...sets.passed].sort()).toEqual(["A", "B"]);
    expect([...sets.inProgress]).toEqual(["D"]);
  });
});

describe("courseStatus", () => {
  it("reports passed and in-progress first", () => {
    expect(courseStatus("A", ["Z"], sets)).toBe("passed");
    expect(courseStatus("D", undefined, sets)).toBe("in-progress");
  });
  it("needs prerequisite data before saying can-take", () => {
    expect(courseStatus("X", undefined, sets)).toBe("unknown");
    expect(courseStatus("X", [], sets)).toBe("can-take");
    expect(courseStatus("X", ["A", "B"], sets)).toBe("can-take");
  });
  it("tells waiting apart from blocked", () => {
    expect(courseStatus("X", ["A", "D"], sets)).toBe("waiting");
    expect(courseStatus("X", ["C", "D"], sets)).toBe("blocked");
    expect(missingPrereqs(["A", "C", "D"], sets)).toEqual(["C", "D"]);
  });
});

describe("helpers", () => {
  it("finds courses a course unlocks", () => {
    expect(unlocks("A", { X: ["A"], Y: ["B", "A"], Z: [] })).toEqual(["X", "Y"]);
  });
  it("parses credit patterns", () => {
    expect(parseCreditPattern("3(2-3-6)")).toEqual({ credits: 3, lecture: 2, lab: 3, self: 6 });
    expect(parseCreditPattern(undefined)).toBeNull();
  });
  it("matches code, English and Thai", () => {
    const c = { code: "01418221", nameEn: "Fundamentals of Database Systems", nameTh: "ระบบฐานข้อมูลเบื้องต้น" };
    expect(matchesQuery(c, "database")).toBe(true);
    expect(matchesQuery(c, "ฐานข้อมูล")).toBe(true);
    expect(matchesQuery(c, "0141822")).toBe(true);
    expect(matchesQuery(c, "calculus")).toBe(false);
  });
});
