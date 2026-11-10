import type { CourseRecord } from "@/core/types";

/**
 * The transcript read in Upload is held here until the user confirms it in
 * Review. sessionStorage keeps it across a page refresh but not across tabs.
 */
const KEY = "reiann.transcript.draft";

export interface TranscriptDraft {
  fileName: string;
  issued: string;
  records: CourseRecord[];
  /** Codes whose grade could not be read. */
  unreadable: string[];
}

export function saveDraft(d: TranscriptDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d));
  } catch {}
}

export function loadDraft(): TranscriptDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TranscriptDraft) : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

export const MAX_BYTES = 5 * 1024 * 1024;

export type FileProblem = "type" | "size";

export function checkFile(file: File): FileProblem | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "type";
  if (file.size > MAX_BYTES) return "size";
  return null;
}
