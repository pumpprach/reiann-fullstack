"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { Banner, Card, Tag } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatGpa, isLetterGrade, summarize, supersededAttempts, termGpa } from "@/core/grades";
import type { CourseRecord, Grade, TermId } from "@/core/types";
import { useConfirmTranscript } from "@/data/hooks";
import { clearDraft, loadDraft, type TranscriptDraft } from "@/features/transcript/draft";
import { useRouter } from "@/i18n/navigation";
import { splitTerm } from "@/lib/format";
import { findCourse } from "@/mocks/courses";

const GRADE_OPTIONS: Grade[] = ["A", "B+", "B", "C+", "C", "D+", "D", "F", "P", "S", "U", "W", "I"];

export default function TranscriptReviewPage() {
  const t = useTranslations("transcript");
  const tc = useTranslations("common");
  const router = useRouter();
  const confirm = useConfirmTranscript();
  // Gate renders this page only in the browser, so sessionStorage is available.
  const [draft] = useState<TranscriptDraft | null>(() => loadDraft());
  const [records, setRecords] = useState<CourseRecord[]>(() => draft?.records ?? []);
  const [open, setOpen] = useState<Record<string, boolean>>(() => (draft ? { [draft.records[0].term]: true } : {}));

  useEffect(() => {
    if (!draft) router.replace("/onboarding/transcript");
  }, [draft, router]);

  const terms = useMemo(() => [...new Set(records.map((r) => r.term))] as TermId[], [records]);
  const completedTerms = terms.filter((term) => records.some((r) => r.term === term && r.grade !== null));
  const currentTerm = terms.find((term) => !completedTerms.includes(term));
  const unreadable = new Set(draft?.unreadable ?? []);
  const missing = records.filter((r) => unreadable.has(r.code) && r.grade === null);
  const superseded = new Set(supersededAttempts(records));
  const retakes = [...new Set(records.filter((r) => records.filter((x) => x.code === r.code).length > 1).map((r) => r.code))];
  const notInCurriculum = records.filter((r) => findCourse(r.code)?.category === "free").map((r) => r.code);
  const summary = summarize(records);
  const readable = records.filter((r) => r.term !== currentTerm).length - missing.length;

  const issues = [
    ...missing.map((r) => t("issueUnreadable", { code: r.code })),
    ...retakes.map((code) => t("issueRetake", { code, times: records.filter((r) => r.code === code).length })),
    ...[...new Set(notInCurriculum)].map((code) => t("issueFree", { code })),
  ];

  function setGrade(index: number, grade: Grade) {
    setRecords((rs) => rs.map((r, i) => (i === index ? { ...r, grade } : r)));
  }

  async function onConfirm() {
    if (!draft) return;
    await confirm.mutateAsync({ records, issued: draft.issued });
    clearDraft();
    toast.success(t("confirmed"));
    router.push("/");
  }

  if (!draft) return null;

  return (
    <div>
      <p className="type-small text-text-secondary">{t("reviewEyebrow")}</p>
      <h1 className="type-h1 text-text">{t("reviewTitle")}</h1>
      <p className="mt-1 type-body text-text-secondary">{t("reviewBody")}</p>

      {issues.length > 0 && (
        <Banner tone="warning" title={t("issuesTitle", { count: issues.length })} className="mt-6">
          <ul>
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </Banner>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {[
          { label: t("statGpax"), value: formatGpa(summary.gpa), hint: t("statGpaxHint") },
          { label: t("statCredits"), value: summary.earnedCredits, hint: t("statCreditsHint") },
          { label: t("statCourses"), value: readable, hint: t("statCoursesHint", { terms: completedTerms.length }) },
          { label: t("statCheck"), value: tc("courses", { count: missing.length }), hint: t("statCheckHint"), warn: missing.length > 0 },
        ].map((s) => (
          <Card key={s.label} className={cn("p-4", s.warn && "border-warning bg-warning-bg")}>
            <p className="type-small text-text-secondary">{s.label}</p>
            <p className="type-stat text-text">{s.value}</p>
            <p className="type-caption text-text-secondary">{s.hint}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {terms.map((term) => {
          const rows = records.map((r, i) => ({ r, i })).filter(({ r }) => r.term === term);
          const isCurrent = term === currentTerm;
          const { year, sem } = splitTerm(term);
          const expanded = !!open[term];
          const gpa = termGpa(records, term);
          return (
            <Card key={term} className="p-0">
              <button
                className="flex w-full items-center justify-between px-5 py-4 text-left"
                aria-expanded={expanded}
                onClick={() => setOpen((o) => ({ ...o, [term]: !o[term] }))}
              >
                <span className="flex items-center gap-3">
                  <span className="type-h3 text-text">{tc("term", { sem, year })}</span>
                  <Tag tone={isCurrent ? "amber" : "matcha"} dot>
                    {isCurrent
                      ? t("termInProgress", { count: rows.length })
                      : t("termSummary", { count: rows.length, gpa: formatGpa(gpa) })}
                  </Tag>
                </span>
                <span className="flex items-center gap-1 type-small-medium text-text">
                  {expanded ? t("collapse") : t("expand")}
                  {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </span>
              </button>
              {expanded && (
                <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-t border-border type-small">
                  <thead className="bg-surface-alt text-left text-text-secondary">
                    <tr>
                      <th className="w-32 px-5 py-2 font-medium">{t("colCode")}</th>
                      <th className="px-2 py-2 font-medium">{t("colName")}</th>
                      <th className="w-28 px-2 py-2 font-medium">{t("colCredits")}</th>
                      <th className="w-56 px-2 py-2 font-medium">{t("colGrade")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ r, i }) => {
                      const course = findCourse(r.code);
                      const needs = unreadable.has(r.code) && r.grade === null;
                      const old = superseded.has(r);
                      const nonGpa = r.grade !== null && !isLetterGrade(r.grade);
                      return (
                        <tr key={`${r.code}-${r.term}`} className={cn("border-t border-border", needs && "bg-warning-bg", old && "text-text-muted line-through")}>
                          <td className="px-5 py-2">{r.code}</td>
                          <td className="px-2 py-2">{course?.nameEn ?? r.code}</td>
                          <td className="px-2 py-2">
                            {r.credits}
                            {nonGpa && "*"}
                          </td>
                          <td className="px-2 py-2">
                            {isCurrent ? (
                              <span className="text-text-secondary no-underline">{t("pending")}</span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <Select value={r.grade ?? undefined} onValueChange={(g) => setGrade(i, g as Grade)}>
                                  <SelectTrigger
                                    size="sm"
                                    aria-label={`${t("colGrade")} ${r.code}`}
                                    className={cn("w-auto min-w-16", needs && "border-warning bg-warning-bg")}
                                  >
                                    <SelectValue placeholder={t("chooseGrade")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {GRADE_OPTIONS.map((g) => (
                                      <SelectItem key={g} value={g}>
                                        {g}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {needs && <span className="type-caption text-warning no-underline">{t("unreadable")}</span>}
                                {old && <span className="type-caption no-underline">{t("superseded")}</span>}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
              {expanded && <p className="border-t border-border px-5 py-2 type-caption text-text-secondary">{t("nonGpaNote")}</p>}
            </Card>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push("/onboarding/transcript")}>
          {t("reupload")}
        </Button>
        <div className="flex items-center gap-4">
          {missing.length > 0 && <span className="type-caption text-text-secondary">{t("confirmHint")}</span>}
          <Button onClick={onConfirm} disabled={missing.length > 0 || confirm.isPending}>
            {t("confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
