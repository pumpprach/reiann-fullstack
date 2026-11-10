import type { CourseRecord } from "@/core/types";

/** What the demo "reads" from a transcript. 01418141's grade is unreadable. */
export const SAMPLE_TRANSCRIPT: CourseRecord[] = [
  { code: "01355101", term: "2568/1", credits: 3, grade: "D" },
  { code: "01361101", term: "2568/1", credits: 3, grade: "B+" },
  { code: "01401201", term: "2568/1", credits: 3, grade: "A" },
  { code: "01417111", term: "2568/1", credits: 3, grade: "A" },
  { code: "01418111", term: "2568/1", credits: 2, grade: "B+" },
  { code: "01418112", term: "2568/1", credits: 3, grade: "B+" },
  { code: "01418141", term: "2568/1", credits: 3, grade: null },
  { code: "01999111", term: "2568/1", credits: 2, grade: "A" },
  { code: "01175168", term: "2568/1", credits: 1, grade: "S" },
  { code: "01255101", term: "2568/1", credits: 3, grade: "B" },
  { code: "01355101", term: "2568/2", credits: 3, grade: "B" },
  { code: "01355107", term: "2568/2", credits: 3, grade: "B+" },
  { code: "01417112", term: "2568/2", credits: 3, grade: "A" },
  { code: "01417322", term: "2568/2", credits: 3, grade: "B+" },
  { code: "01418113", term: "2568/2", credits: 3, grade: "A" },
  { code: "01418132", term: "2568/2", credits: 3, grade: "A" },
  // In progress this term
  { code: "01418211", term: "2569/1", credits: 3, grade: null },
  { code: "01418231", term: "2569/1", credits: 3, grade: null },
  { code: "01418233", term: "2569/1", credits: 3, grade: null },
  { code: "01418235", term: "2569/1", credits: 3, grade: null },
  { code: "01418363", term: "2569/1", credits: 3, grade: null },
  { code: "01387101", term: "2569/1", credits: 3, grade: null },
  { code: "01421201", term: "2569/1", credits: 2, grade: null },
  { code: "01371111", term: "2569/1", credits: 1, grade: null },
];

/** Codes whose grade the reader could not read (Needs Attention). */
export const UNREADABLE = new Set(["01418141"]);

export const CURRENT_TERM = "2569/1" as const;
export const TRANSCRIPT_ISSUED = "2026-08-28";
