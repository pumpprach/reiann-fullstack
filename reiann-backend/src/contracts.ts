export type Grade = "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "F" | "P" | "S" | "U" | "W" | "I";
export type LetterGrade = "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "F";
export type TranscriptStatus = "pending" | "skipped" | "confirmed";
export interface Profile {
  programId: string;
  campusId: string;
  year: number;
  transcript: TranscriptStatus;
  transcriptIssued?: string;
}
export interface CourseRecord { code: string; term: string; credits: number; grade: Grade | null }
export interface ScoreCategory { id: string; name: string; weight: number; score: number | null; max: number }
export interface CalculatorState {
  courseCode: string;
  categories: ScoreCategory[];
  target: LetterGrade;
  cutoffMode: "fixed" | "curve";
  cutoffs: Record<LetterGrade, number>;
  updatedAt: string;
}
export interface ClassSlot {
  id: string; courseCode: string; day: number; start: string; end: string;
  kind: "lecture" | "lab"; room?: string; section?: string;
}
export interface ShareLinkOptions {
  name: string; expiresInDays: 7 | 30 | null;
  showCourseNames: boolean; allowCompare: boolean;
}
export interface ShareLink extends ShareLinkOptions {
  token: string; createdAt: string; expiresAt: string; revoked: boolean;
}
export interface SharedSchedule {
  ownerLabel: string; term: string; expiresAt: string; updatedAt: string;
  showCourseNames: boolean; allowCompare: boolean; slots: ClassSlot[];
}
