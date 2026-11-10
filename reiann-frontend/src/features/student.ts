"use client";

import { useMemo } from "react";
import { earnsCredits, latestAttempts, summarize } from "@/core/grades";
import type { CourseRecord, CreditCategory } from "@/core/types";
import { useRecords } from "@/data/hooks";
import { findCourse } from "@/mocks/courses";
import { CURRENT_TERM } from "@/mocks/transcript";

/** Derived numbers used by Home, the calculator and the schedule. */
export function useStudent() {
  const records = useRecords();
  return useMemo(() => derive(records.data ?? [], records.isPending), [records.data, records.isPending]);
}

function derive(all: CourseRecord[], isPending: boolean) {
  const summary = summarize(all);
  const current = all.filter((r) => r.term === CURRENT_TERM && r.grade === null);
  const byCategory: Record<CreditCategory, number> = { general: 0, core: 0, required: 0, elective: 0, free: 0 };
  // Same rule as GPAX: only the latest attempt of a retaken course counts.
  for (const r of latestAttempts(all)) {
    const c = findCourse(r.code);
    if (c && earnsCredits(r.grade)) byCategory[c.category] += r.credits;
  }
  return {
    isPending,
    records: all,
    summary,
    current,
    currentCredits: current.reduce((n, r) => n + r.credits, 0),
    byCategory,
  };
}
