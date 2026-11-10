import { describe, expect, it } from "vitest";
import { ancestors, descendants, simulateDelay, termAt, termIndex } from "./plan";

const prereqs = { B: ["A"], C: ["B"], D: ["B"], E: ["X"] };
const plan = { A: [2, 1], B: [2, 2], C: [3, 1], D: [3, 2] } as const;

describe("terms", () => {
  it("maps year and semester to an index and back", () => {
    expect(termIndex([1, 1])).toBe(0);
    expect(termIndex([4, 2])).toBe(7);
    expect(termAt(3)).toEqual([2, 2]);
  });
});

describe("paths", () => {
  it("finds courses before and after", () => {
    expect([...descendants("A", prereqs)].sort()).toEqual(["B", "C", "D"]);
    expect([...ancestors("C", prereqs)].sort()).toEqual(["A", "B"]);
  });
});

describe("simulateDelay", () => {
  it("pushes the chain only as far as it has to", () => {
    // A failed in year 2 sem 1 (index 2) → retake index 3.
    const rows = simulateDelay("A", 3, plan, prereqs);
    const by = Object.fromEntries(rows.map((r) => [r.code, r]));
    expect(by.A.shift).toBe(1);
    expect(by.B).toMatchObject({ earliest: 4, shift: 1 });
    expect(by.C).toMatchObject({ earliest: 5, shift: 1 });
    // D was planned a term later than needed, so it absorbs the delay.
    expect(by.D).toMatchObject({ earliest: 5, shift: 0 });
  });
});
