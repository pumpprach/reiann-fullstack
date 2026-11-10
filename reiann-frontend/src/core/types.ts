/**
 * Shared data types. This folder must not import React or Next.js so the
 * same code can run in a future mobile app (Expo) or on the server.
 */

export type LetterGrade = "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "F";
/** Grades that never count toward GPAX. */
export type SpecialGrade = "P" | "S" | "U" | "W" | "I";
export type Grade = LetterGrade | SpecialGrade;

export type CreditCategory =
  | "general" // ศึกษาทั่วไป
  | "core" // วิชาแกน
  | "required" // เฉพาะบังคับ
  | "elective" // เฉพาะเลือก
  | "free"; // เลือกเสรี

export interface Course {
  code: string;
  nameEn: string;
  nameTh: string;
  credits: number;
  /** e.g. "3(3-0-6)" */
  creditPattern?: string;
  category: CreditCategory;
  /** S/U courses are pass/fail only. */
  gradingMode?: "letter" | "su";
}

/** "2568/1" = first semester of academic year 2568. */
export type TermId = `${number}/${1 | 2 | 3}`;

export interface CourseRecord {
  code: string;
  term: TermId;
  credits: number;
  /** null while the course is in progress or the grade could not be read. */
  grade: Grade | null;
}

export interface Program {
  id: string;
  facultyEn: string;
  facultyTh: string;
  nameEn: string;
  nameTh: string;
  curriculumYear: number;
  totalCredits: number;
  creditTargets: Record<CreditCategory, number>;
  /** false = no study plan data yet (show "No Plan Yet"). */
  hasPlan: boolean;
}
