"use client";

import { AlertTriangle, CalendarClock, Check, ChevronRight, Clock, FileText, Lock, LockOpen, Search, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "cn";
import { PageHeader } from "@/components/app/shell";
import { Card, Chip, ProgressBar, Skeleton } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { formatGpa, termGpa } from "@/core/grades";
import type { CreditCategory } from "@/core/types";
import { useProfile } from "@/data/hooks";
import { CATEGORY_STYLE, CategoryDot, CategoryTag, CategoryTile } from "@/features/courses/category";
import { useStudent } from "@/features/student";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { CS_PROGRAM } from "@/mocks/programs";
import { findCourse, PLAN_NEXT_TERM } from "@/mocks/courses";

const BARS: CreditCategory[] = ["general", "core", "required", "elective", "free"];

/** Demo prerequisites for the plan list. */
const PREREQ: Record<string, { code: string; unlocks?: number }> = {
  "01418221": { code: "01418113", unlocks: 3 },
  "01418232": { code: "01418231" },
  "01418236": { code: "01418233" },
};

export default function HomePage() {
  const t = useTranslations("home");
  const router = useRouter();
  const tc = useTranslations("common");
  const locale = useLocale();
  const profile = useProfile().data;
  const s = useStudent();
  const gpaxText = formatGpa(s.summary.gpa);
  const passed = new Set(s.records.filter((r) => r.grade && r.grade !== "F").map((r) => r.code));

  return (
    <>
      <div className="relative isolate">
        <div className="hero-blobs -inset-x-4 -top-5 -bottom-6 md:-inset-x-8 md:-top-8" aria-hidden>
          <span />
        </div>
        <PageHeader
          eyebrow={t("eyebrow", { term: tc("term", { sem: "2", year: 2569 }), year: profile?.year ?? 2 })}
          title={t("title")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="pop-card flex flex-col gap-1 [--pop:var(--color-pop-mango)]">
          <p className="flex items-center gap-2 type-small text-text-secondary">
            <span data-tile className="inline-flex size-8 items-center justify-center rounded-md bg-warning-bg text-warning">
              <Star className="size-4" aria-hidden />
            </span>
            {t("gpaxLabel")}
          </p>
          {s.isPending ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <p className="type-stat text-text">{gpaxText}</p>
          )}
          <p className="type-caption text-text-secondary">
            {s.summary.gpa === null
              ? t("gpaxNone")
              : [
                  ...(["2568/1", "2568/2"] as const).map((term) => {
                    const g = termGpa(s.records, term);
                    const [y, sem] = term.split("/");
                    return g === null ? null : t("termGpa", { term: tc("term", { sem, year: y }), gpa: formatGpa(g) });
                  }),
                  t("gpaxDetail", { credits: s.summary.earnedCredits }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
          <Button variant="outline" className="mt-auto" asChild>
            <Link href={s.summary.gpa === null ? "/onboarding/transcript" : "/soon/grades"}>
              {s.summary.gpa === null ? t("uploadTranscript") : t("viewGrades")}
            </Link>
          </Button>
        </Card>

        <Card className="pop-card flex flex-col gap-1 [--pop:var(--color-pop-sky)]">
          <p className="flex items-center gap-2 type-small text-text-secondary">
            <span data-tile className="inline-flex size-8 items-center justify-center rounded-md bg-info-bg text-info">
              <Clock className="size-4" aria-hidden />
            </span>
            {t("termLabel", { term: tc("term", { sem: "1", year: 2569 }) })}
          </p>
          <p className="type-stat text-text">{t("pendingCount", { count: s.current.length })}</p>
          <p className="type-caption text-text-secondary">{t("pendingDetail", { credits: s.currentCredits })}</p>
          <Button variant="outline" className="mt-auto" asChild>
            <Link href="/calculator">{t("openCalculator")}</Link>
          </Button>
        </Card>

        <Card className="pop-card flex flex-col gap-1 [--pop:var(--color-pop-pink)]">
          <p className="flex items-center gap-2 type-small text-text-secondary">
            <span data-tile className="inline-flex size-8 items-center justify-center rounded-md bg-error-bg text-error">
              <AlertTriangle className="size-4" aria-hidden />
            </span>
            {t("deadlineLabel", { days: 14 })}
          </p>
          <p className="type-stat text-text">{t("deadlineTitle")}</p>
          <p className="type-caption text-text-secondary">{t("deadlineDetail")}</p>
          <Button variant="outline" className="mt-auto" asChild>
            <Link href="/soon/exams">{t("viewExams")}</Link>
          </Button>
        </Card>
      </div>

      <form
        className="field mt-6 flex h-14 items-center gap-3 md:h-16 rounded-lg border border-border-strong bg-surface pr-2 pl-4"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q")?.toString().trim();
          router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
        }}
      >
        <Search className="size-5 text-text-secondary" aria-hidden />
        <input
          name="q"
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="min-w-0 flex-1 bg-transparent type-body outline-none placeholder:text-text-secondary"
        />
        <Button type="submit">{t("search")}</Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip selected onClick={() => router.push("/search")}>
          <Check className="size-4" aria-hidden />
          {t("filterPlan")}
        </Chip>
        <Chip pop="matcha" onClick={() => router.push("/search?status=can-take")}>
          <LockOpen className="size-4 text-success" aria-hidden />
          {t("filterAvailable")}
        </Chip>
        {(["required", "elective", "general", "free"] as const).map((k) => (
          <Chip key={k} pop={CATEGORY_STYLE[k].color} onClick={() => router.push(`/search?category=${k}`)}>
            <CategoryDot category={k} />
            {tc(`category.${k}`)}
          </Chip>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="type-h3 text-text">{t("planTitle")}</h2>
            <Link href="/courses/plan" className="flex items-center gap-1 type-small-medium text-text hover:underline">
              {tc("seeAll")}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul>
            {PLAN_NEXT_TERM.map((code) => {
              const c = findCourse(code)!;
              const pre = PREREQ[code];
              const unlocked = pre && passed.has(pre.code);
              return (
                <li key={code} className={cn("pop-row grid gap-3 border-b md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-center md:gap-4 border-border px-5 py-4 last:border-b-0", CATEGORY_STYLE[c.category].pop)}>
                  <div className="flex min-w-0 gap-3 md:gap-4">
                    <CategoryTile category={c.category} className="mt-0.5" />
                    <div className="min-w-0">
                      <p className="type-h3 text-text">{c.nameEn}</p>
                      {locale === "th" && <p className="type-small text-text-secondary">{c.nameTh}</p>}
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 type-small text-text-secondary">
                        <span className="type-small-medium text-text">{code}</span>
                        <CategoryTag category={c.category} />
                        <span>{tc("credits", { count: c.credits })}</span>
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 type-small text-text-secondary">
                        {unlocked ? <Check className="size-4 text-success" aria-hidden /> : <Lock className="size-4 text-warning" aria-hidden />}
                        {unlocked ? t("unlocked", { code: pre.code, count: pre.unlocks ?? 0 }) : t("waiting", { code: pre.code })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 type-small text-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="size-4 text-info" aria-hidden />
                      {c.creditPattern}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText className="size-4 text-primary" aria-hidden />
                      {t("plan")}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/course/${code}`}>{t("viewCourse")}</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="flex flex-col gap-4 self-start">
          <div>
            <h2 className="type-h3 text-text">{t("creditsTitle")}</h2>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="type-stat text-primary">{s.summary.earnedCredits}</span>
              <span className="type-small text-text-secondary">
                {t("creditsOf", { total: CS_PROGRAM.totalCredits, current: s.currentCredits })}
              </span>
            </p>
          </div>
          {BARS.map((key) => {
            const { bar, Icon, tile } = CATEGORY_STYLE[key];
            const target = CS_PROGRAM.creditTargets[key];
            const have = s.byCategory[key];
            return (
              <div key={key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between type-small">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <span className={cn("inline-flex size-6 items-center justify-center rounded-sm", tile)} aria-hidden>
                      <Icon className="size-3.5" />
                    </span>
                    {tc(`category.${key}`)}
                  </span>
                  <span className="type-small-medium text-text">
                    {have} / {target}
                  </span>
                </div>
                <ProgressBar value={(have / target) * 100} barClassName={bar} label={tc(`category.${key}`)} />
              </div>
            );
          })}
        </Card>
      </div>
      <p className="mt-6 type-caption text-text-secondary">
        {t("footnote", {
          year: CS_PROGRAM.curriculumYear,
          issued: profile?.transcriptIssued ? formatDate(profile.transcriptIssued, locale) : "–",
        })}
      </p>
    </>
  );
}
