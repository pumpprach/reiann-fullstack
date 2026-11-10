import { describe, expect, it } from "vitest";
import { conflictingIds, hourRange, slotIssue, toMinutes, type ClassSlot } from "./schedule";

const s = (id: string, day: ClassSlot["day"], start: string, end: string): ClassSlot => ({ id, courseCode: id, day, start, end, kind: "lecture" });

describe("schedule", () => {
  it("parses times", () => {
    expect(toMinutes("09:30")).toBe(570);
    expect(Number.isNaN(toMinutes("25:00"))).toBe(true);
  });

  it("validates a slot", () => {
    expect(slotIssue({ start: "13:00", end: "12:00" })).toBe("end-before-start");
    expect(slotIssue({ start: "13:00", end: "13:00" })).toBe("end-before-start");
    expect(slotIssue({ start: "06:30", end: "08:00" })).toBe("outside-hours");
    expect(slotIssue({ start: "19:00", end: "20:30" })).toBe("outside-hours");
    expect(slotIssue({ start: "9", end: "10:00" })).toBe("bad-time");
    expect(slotIssue({ start: "07:00", end: "20:00" })).toBeNull();
  });

  it("finds overlapping slots but not touching ones", () => {
    const ids = conflictingIds([s("a", 0, "09:00", "11:00"), s("b", 0, "10:30", "12:00"), s("c", 0, "12:00", "13:00"), s("d", 1, "09:00", "11:00")]);
    expect([...ids].sort()).toEqual(["a", "b"]);
  });

  it("computes the hour range", () => {
    expect(hourRange([s("a", 0, "09:00", "11:00"), s("b", 4, "13:00", "14:30")])).toEqual([9, 15]);
  });
});
