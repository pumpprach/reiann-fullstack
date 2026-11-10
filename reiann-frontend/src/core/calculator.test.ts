import { describe, expect, it } from "vitest";
import {
  bestReachableGrade,
  moveItem,
  gradeForTotal,
  requiredForGrade,
  scoreIssue,
  suOutcome,
  summarizeScores,
  type ScoreCategory,
} from "./calculator";

const cat = (weight: number, score: number | null, max = weight, name = "x"): ScoreCategory => ({ id: name + weight, name, weight, score, max });

// The Figma example: 49/60 collected, final worth 40 still pending.
const example = [cat(10, 8), cat(10, 9), cat(10, 8), cat(30, 24), cat(40, null)];

describe("summarizeScores", () => {
  it("matches the Figma example", () => {
    const s = summarizeScores(example);
    expect(s.weightsComplete).toBe(true);
    expect(s.collected).toBe(49);
    expect(s.pendingWeight).toBe(40);
    expect(s.maxPossible).toBe(89);
  });

  it("scales raw scores by their maximum", () => {
    expect(summarizeScores([cat(20, 45, 50), cat(80, null)]).collected).toBe(18);
  });

  it("treats invalid scores as pending instead of counting them", () => {
    const s = summarizeScores([cat(50, 60, 50), cat(50, -1, 50)]);
    expect(s.collected).toBe(0);
    expect(s.pendingWeight).toBe(100);
  });
});

describe("requiredForGrade", () => {
  it("B+ needs 26 of the final's 40 (65%)", () => {
    const res = requiredForGrade(example, "B+");
    expect(res.status).toBe("needed");
    if (res.status === "needed") {
      expect(res.points).toBe(26);
      expect(res.fraction).toBeCloseTo(0.65);
    }
  });

  it("refuses to calculate when weights do not total 100", () => {
    expect(requiredForGrade([...example, cat(10, null)], "A").status).toBe("incomplete-weights");
  });

  it("reports impossible grades without numbers above full marks", () => {
    const res = requiredForGrade([cat(60, 10), cat(40, null)], "A");
    expect(res).toEqual({ status: "impossible", maxPossible: 50 });
  });

  it("reports a grade already secured even if the final is 0", () => {
    expect(requiredForGrade([cat(60, 60), cat(40, null)], "D").status).toBe("guaranteed");
  });

  it("handles a course with no pending work", () => {
    expect(requiredForGrade([cat(100, 81)], "A")).toEqual({ status: "nothing-pending", achieved: true });
    expect(requiredForGrade([cat(100, 79)], "A")).toEqual({ status: "nothing-pending", achieved: false });
  });
});

describe("grade helpers", () => {
  it("maps totals to grades at the cutoffs", () => {
    expect(gradeForTotal(80)).toBe("A");
    expect(gradeForTotal(79.99)).toBe("B+");
    expect(gradeForTotal(49)).toBe("F");
  });

  it("finds the best reachable grade", () => {
    expect(bestReachableGrade(example)).toBe("A");
  });

  it("flags bad inputs", () => {
    expect(scoreIssue(cat(10, 11, 10))).toBe("over-max");
    expect(scoreIssue(cat(10, -1, 10))).toBe("negative");
    expect(scoreIssue(cat(10, Number.NaN, 10))).toBe("not-number");
    expect(scoreIssue(cat(10, 5, 0))).toBe("bad-max");
    expect(scoreIssue(cat(10, null, 10))).toBeNull();
  });

  it("decides S/U outcomes", () => {
    expect(suOutcome([cat(60, 55), cat(40, null)])).toBe("passed");
    expect(suOutcome([cat(60, 0), cat(40, null)])).toBe("failed");
    expect(suOutcome([cat(60, 30), cat(40, null)])).toBe("open");
  });
});

describe("moveItem", () => {
  const abc = ["a", "b", "c", "d"];
  it("moves an item down", () => expect(moveItem(abc, 0, 2)).toEqual(["b", "c", "a", "d"]));
  it("moves an item up", () => expect(moveItem(abc, 3, 1)).toEqual(["a", "d", "b", "c"]));
  it("clamps the target to the list bounds", () => {
    expect(moveItem(abc, 1, -5)).toEqual(["b", "a", "c", "d"]);
    expect(moveItem(abc, 1, 99)).toEqual(["a", "c", "d", "b"]);
  });
  it("ignores an out-of-range source and never mutates the input", () => {
    expect(moveItem(abc, 7, 0)).toEqual(abc);
    expect(abc).toEqual(["a", "b", "c", "d"]);
  });
});
