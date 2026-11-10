import type { ClassSlot } from "@/core/schedule";

/** The demo user's starting timetable for 2569/1. */
export const SAMPLE_SLOTS: ClassSlot[] = [
  { id: "s1", courseCode: "01418211", day: 0, start: "09:00", end: "11:00", kind: "lecture", room: "SC45-707" },
  { id: "s2", courseCode: "01387101", day: 0, start: "13:00", end: "15:00", kind: "lecture" },
  { id: "s3", courseCode: "01418231", day: 1, start: "13:00", end: "15:00", kind: "lecture", room: "SC45-603" },
  { id: "s4", courseCode: "01418233", day: 2, start: "09:00", end: "11:00", kind: "lecture" },
  { id: "s5", courseCode: "01421201", day: 2, start: "13:00", end: "14:30", kind: "lecture" },
  { id: "s6", courseCode: "01418235", day: 3, start: "13:00", end: "15:00", kind: "lab", room: "SC45-212" },
  { id: "s7", courseCode: "01418363", day: 4, start: "09:00", end: "11:00", kind: "lecture" },
  { id: "s8", courseCode: "01371111", day: 4, start: "13:00", end: "14:30", kind: "lecture" },
];

/** Friend A's schedule behind the /s/demo link. */
export const FRIEND_SCHEDULE = {
  ownerLabel: "เพื่อน A",
  term: "2569/1" as const,
  expiresAt: "2026-11-30",
  updatedAt: "2026-11-07T10:20:00+07:00",
  slots: SAMPLE_SLOTS.map((s) => ({ ...s, id: `f-${s.id}` })),
};
