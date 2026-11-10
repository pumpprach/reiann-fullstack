"use client";

import { Check, CircleAlert, CircleDashed, Clock3, Info, Lock, LockOpen, Minus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { cn } from "cn";
import { courseStatus, missingPrereqs, progressSets, type CourseStatus } from "@/core/courses";
import { latestAttempts } from "@/core/grades";
import { Tag } from "@/components/reiann";
import { useRecords } from "@/data/hooks";
import { PREREQS } from "@/mocks/course-info";
import { CURRENT_TERM } from "@/mocks/transcript";

/** Status of every course for the signed-in student, plus the grade of passed ones. */
export function useCourseStatus() {
  const records = useRecords();
  return useMemo(() => {
    const all = records.data ?? [];
    const sets = progressSets(all, CURRENT_TERM);
    const graded = new Map(latestAttempts(all).map((r) => [r.code, r]));
    return {
      isPending: records.isPending,
      sets,
      status: (code: string): CourseStatus => courseStatus(code, PREREQS[code], sets),
      missing: (code: string) => missingPrereqs(PREREQS[code], sets),
      record: (code: string) => graded.get(code),
    };
  }, [records.data, records.isPending]);
}

export const STATUS_TONE: Record<CourseStatus, "matcha" | "amber" | "neutral" | "blue" | "strawberry"> = {
  passed: "matcha",
  "in-progress": "blue",
  "can-take": "matcha",
  waiting: "amber",
  blocked: "strawberry",
  unknown: "neutral",
};

export const STATUS_ICON = {
  passed: Check,
  "in-progress": Clock3,
  "can-take": LockOpen,
  waiting: Clock3,
  blocked: Lock,
  unknown: Info,
} satisfies Record<CourseStatus, typeof Check>;

/** Icon colors per status (icons only; the text stays text-secondary for contrast). */
export const STATUS_ICON_COLOR: Record<CourseStatus, string> = {
  passed: "text-success",
  "in-progress": "text-info",
  "can-take": "text-success",
  waiting: "text-warning",
  blocked: "text-error",
  unknown: "text-info",
};

/** Grades that are not a normal result, each with its own look. */
export type GradeOutcome = "failed" | "withdrawn" | "incomplete";

export function gradeOutcome(grade: string | null | undefined): GradeOutcome | null {
  if (grade === "F" || grade === "U") return "failed";
  if (grade === "W") return "withdrawn";
  if (grade === "I") return "incomplete";
  return null;
}

export const OUTCOME_ICON = { failed: X, withdrawn: Minus, incomplete: CircleAlert } satisfies Record<GradeOutcome, typeof Check>;
const OUTCOME_TONE = { failed: "strawberry", withdrawn: "neutral", incomplete: "amber" } as const;
/** Text colours that keep 4.5:1 on the surfaces they sit on. */
export const OUTCOME_TEXT: Record<GradeOutcome, string> = {
  failed: "text-danger",
  withdrawn: "text-text-secondary",
  incomplete: "text-warning",
};

export function OutcomeTag({ outcome }: { outcome: GradeOutcome }) {
  const t = useTranslations("courses");
  return (
    <Tag tone={OUTCOME_TONE[outcome]} dot>
      {t(`outcome.${outcome}`)}
    </Tag>
  );
}

export function StatusTag({ status, missing }: { status: CourseStatus; missing?: string[] }) {
  const t = useTranslations("courses");
  return (
    <Tag tone={STATUS_TONE[status]} dot>
      {status === "waiting" && missing?.length ? t("waitingFor", { code: missing[0] }) : t(`status.${status}`)}
    </Tag>
  );
}

/** One-line status with an icon, as on Course Search rows. */
export function StatusLine({ status, missing, prereqs }: { status: CourseStatus; missing: string[]; prereqs?: string[] }) {
  const t = useTranslations("courses");
  const Icon = STATUS_ICON[status] ?? CircleDashed;
  const text =
    status === "can-take"
      ? prereqs?.length
        ? t("line.canTakeAfter", { codes: prereqs.join(", ") })
        : t("line.canTakeNone")
      : status === "waiting" || status === "blocked"
        ? t(`line.${status}`, { codes: missing.join(", ") })
        : t(`line.${status}`);
  return (
    <p className="flex items-center gap-1.5 type-small text-text-secondary">
      <Icon className={cn("size-4 shrink-0", STATUS_ICON_COLOR[status])} aria-hidden />
      {text}
    </p>
  );
}
