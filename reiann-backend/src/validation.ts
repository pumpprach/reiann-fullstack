import { z } from "zod";

export const codeSchema = z.string().regex(/^\d{8}$/);
const termSchema = z.string().regex(/^\d{4}\/[123]$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const gradeSchema = z.enum(["A", "B+", "B", "C+", "C", "D+", "D", "F", "P", "S", "U", "W", "I"]);
const letterSchema = z.enum(["A", "B+", "B", "C+", "C", "D+", "D", "F"]);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const profileSchema = z.object({
  programId: z.string().trim().min(1).max(50),
  campusId: z.string().trim().min(1).max(50),
  year: z.number().int().min(1).max(10),
  transcript: z.enum(["pending", "skipped", "confirmed"]),
  transcriptIssued: dateSchema.optional(),
}).strict();

export const recordSchema = z.object({
  code: codeSchema, term: termSchema,
  credits: z.number().positive().max(30),
  grade: gradeSchema.nullable(),
}).strict();
export const recordsSchema = z.object({
  records: z.array(recordSchema).max(300).refine(
    (items) => new Set(items.map((r) => `${r.code}:${r.term}`)).size === items.length,
    "Duplicate course and term",
  ),
  issued: dateSchema.optional(),
  status: z.literal("confirmed").optional(),
}).strict();

const scoreCategorySchema = z.object({
  id: z.string().min(1).max(40), name: z.string().max(80),
  weight: z.number().finite().min(0).max(100),
  score: z.number().finite().min(0).max(10000).nullable(),
  max: z.number().finite().positive().max(10000),
}).strict();
export const calculatorSchema = z.object({
  courseCode: codeSchema,
  categories: z.array(scoreCategorySchema).max(30),
  target: letterSchema,
  cutoffMode: z.enum(["fixed", "curve"]),
  cutoffs: z.object({
    A: z.number().finite(), "B+": z.number().finite(), B: z.number().finite(),
    "C+": z.number().finite(), C: z.number().finite(), "D+": z.number().finite(),
    D: z.number().finite(), F: z.number().finite(),
  }).strict(),
  updatedAt: z.string().optional(),
}).strict();

export const slotSchema = z.object({
  id: z.uuid(), courseCode: codeSchema, day: z.number().int().min(0).max(6),
  start: timeSchema, end: timeSchema,
  kind: z.enum(["lecture", "lab"]),
  room: z.string().max(100).optional(), section: z.string().max(50).optional(),
}).strict().refine((s) => s.end > s.start && s.start >= "07:00" && s.end <= "20:00", "Invalid class time");

export const shareOptionsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  expiresInDays: z.union([z.literal(7), z.literal(30), z.null()]),
  showCourseNames: z.boolean(), allowCompare: z.boolean(),
}).strict();
export const planSchema = z.object({ codes: z.array(codeSchema).max(100) }).strict();
