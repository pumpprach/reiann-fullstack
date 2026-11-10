import type { Course, TermId } from "@/core/types";

export function splitTerm(term: TermId): { year: number; sem: "1" | "2" | "3" } {
  const [y, s] = term.split("/");
  return { year: Number(y), sem: s as "1" | "2" | "3" };
}

/** "20 พ.ย. 2569" (Thai) — Buddhist year comes from the th-TH calendar. */
export function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso.length === 10 ? `${iso}T12:00:00+07:00` : iso));
}

export function formatTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

/** Course names: English first, Thai second on Thai pages; English only on English pages. */
export function courseNames(course: Pick<Course, "nameEn" | "nameTh">, locale: string) {
  return { primary: course.nameEn, secondary: locale === "th" ? course.nameTh : null };
}
