import type { Cutoffs, ScoreCategory } from "@/core/calculator";
import type { ClassSlot } from "@/core/schedule";
import type { CourseRecord, LetterGrade, TermId } from "@/core/types";

/** Data operations used by both the local preview and Supabase. */

export interface DemoUser {
  id: string;
  email: string;
  displayName: string;
  /** Signed in with a verified @ku.th address (future community features). */
  kuVerified: boolean;
}

export type TranscriptStatus = "pending" | "skipped" | "confirmed";

export interface Profile {
  programId: string;
  campusId: string;
  year: number;
  transcript: TranscriptStatus;
  transcriptIssued?: string;
}

export interface CalculatorState {
  courseCode: string;
  categories: ScoreCategory[];
  target: LetterGrade;
  cutoffMode: "fixed" | "curve";
  cutoffs: Cutoffs;
  updatedAt: string;
}

export interface ShareLinkOptions {
  name: string;
  /** Days until expiry; null = end of term. */
  expiresInDays: 7 | 30 | null;
  showCourseNames: boolean;
  allowCompare: boolean;
}

export interface ShareLink extends ShareLinkOptions {
  token: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
}

export interface SharedSchedule {
  ownerLabel: string;
  term: TermId;
  expiresAt: string;
  updatedAt: string;
  showCourseNames: boolean;
  allowCompare: boolean;
  slots: ClassSlot[];
}

export interface Repository {
  getUser(): Promise<DemoUser | null>;
  signIn(): Promise<void>;
  signOut(): Promise<void>;

  getProfile(): Promise<Profile | null>;
  saveProfile(p: Profile): Promise<Profile>;

  getRecords(): Promise<CourseRecord[]>;
  confirmTranscript(records: CourseRecord[], issued: string): Promise<void>;
  skipTranscript(): Promise<void>;
  /** Replaces the student's course records (edits to a registered term). */
  saveRecords(records: CourseRecord[]): Promise<CourseRecord[]>;

  getCalculator(code: string): Promise<CalculatorState>;
  saveCalculator(state: CalculatorState): Promise<CalculatorState>;
  getLastCalculatorCode(): Promise<string | null>;

  getSlots(): Promise<ClassSlot[]>;
  saveSlot(slot: ClassSlot): Promise<ClassSlot>;
  deleteSlot(id: string): Promise<void>;

  listShareLinks(): Promise<ShareLink[]>;
  createShareLink(opts: ShareLinkOptions): Promise<ShareLink>;
  revokeShareLink(token: string): Promise<void>;
  /** Public: works without signing in. null = revoked, expired or unknown. */
  getSharedSchedule(token: string): Promise<SharedSchedule | null>;

  /** Courses planned for next term. null = not saved yet (use the curriculum plan). */
  getNextTermPlan(): Promise<string[] | null>;
  saveNextTermPlan(codes: string[]): Promise<string[]>;

  resetData(): Promise<void>;
}
