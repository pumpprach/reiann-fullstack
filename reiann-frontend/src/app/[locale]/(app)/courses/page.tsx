"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "cn";
import type { CourseStatus } from "@/core/courses";
import { formatGpa, termGpa } from "@/core/grades";
import type { CreditCategory, TermId } from "@/core/types";
import { Card, Chip, ProgressBar, Segmented, Skeleton, Tag } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { CATEGORY_STYLE, FILTER_POP } from "@/features/courses/category";
import { NoPlanYet, usePlan } from "@/features/courses/plan";
import { gradeOutcome, OUTCOME_ICON, OUTCOME_TEXT, OutcomeTag, StatusTag, useCourseStatus, type GradeOutcome } from "@/features/courses/status";
import { AddTermCourseDialog, TermCourseRow } from "@/features/courses/term-course-editor";
import { useStudent } from "@/features/student";
import { Link, useRouter } from "@/i18n/navigation";
import { PLAN_SLOTS, PLAN_TERM, STUDENT_TERMS, TERM_CREDIT_RANGE } from "@/mocks/course-info";
import { CURRICULUM_CODES, findCourse } from "@/mocks/courses";
import { CURRENT_TERM } from "@/mocks/transcript";
import { CS_PROGRAM } from "@/mocks/programs";

type Filter = "all" | "can-take" | "in-progress" | "blocked";
const FILTER_MATCH: Record<Filter, (s: CourseStatus) => boolean> = {
  all: () => true,
  "can-take": (s) => s === "can-take",
  "in-progress": (s) => s === "in-progress",
  blocked: (s) => s === "blocked" || s === "waiting",
};

/** Checkbox-like marker at the start of each row, coloured by status. */
const MARK: Record<CourseStatus, string> = {
  passed: "border-primary bg-primary",
  "in-progress": "border-info",
  "can-take": "border-primary border-2",
  waiting: "border-warning border-dashed",
  blocked: "border-secondary-strong border-dashed",
  unknown: "border-border-strong border-dashed",
};

const OUTCOME_MARK: Record<GradeOutcome, string> = {
  failed: "border-danger bg-danger text-on-danger",
  withdrawn: "border-border-strong bg-surface-alt text-text-secondary",
  incomplete: "border-warning bg-warning-bg text-warning",
};

const BAR: Record<CreditCategory, string> = {
  general: "bg-secondary",
  core: "bg-info",
  required: "bg-primary",
  elective: "bg-career",
  free: "bg-grade",
};

/** Figma: Light / Courses / List. Route /courses (frontend-flows §4.6). */
export default function CoursesListPage() {
  const t = useTranslations("courses.list");
  const plan = usePlan();
  if (plan.isPending) return <Skeleton className="h-96 w-full" />;
  // §2 rule 6: programs without plan data get No Plan Yet instead of CS data.
  if (!plan.hasPlan) return <NoPlanYet title={t("title")} />;
  return <CoursesList />;
}

/** Plan summary rows: each status with the colour of its tag. */
const PLAN_ROWS: { status: CourseStatus; dot: string }[] = [
  { status: "can-take", dot: "bg-primary" },
  { status: "waiting", dot: "bg-warning" },
  { status: "blocked", dot: "bg-error" },
  { status: "unknown", dot: "bg-border-strong" },
  { status: "in-progress", dot: "bg-info" },
  { status: "passed", dot: "bg-success" },
];

function CoursesList() {
  const t = useTranslations("courses.list");
  const tCourses = useTranslations("courses");
  const plan = usePlan();
  const tc = useTranslations("common");
  const router = useRouter();
  const student = useStudent();
  const st = useCourseStatus();
  const [filter, setFilter] = useState<Filter>("all");

  const records = student.records;
  const codesIn = (term: TermId) => [...new Set(records.filter((r) => r.term === term).map((r) => r.code))];
  const gradeIn = (term: TermId) => (code: string) => records.find((r) => r.term === term && r.code === code)?.grade ?? null;
  const passedIn = (term: TermId) => records.filter((r) => r.term === term && r.grade !== null && !["F", "U", "W", "I"].includes(r.grade));

  // Credits in progress by category, for the "credits left" bars.
  const currentByCat: Record<CreditCategory, number> = { general: 0, core: 0, required: 0, elective: 0, free: 0 };
  for (const r of student.current) {
    const c = findCourse(r.code);
    if (c) currentByCat[c.category] += r.credits;
  }
  const passedTotal = Object.values(student.byCategory).reduce((a, b) => a + b, 0);

  const nextCodes = plan.nextPlan;
  const nextSlots = PLAN_SLOTS.filter((s) => s.year === 2 && s.sem === 2);
  const nextCredits = nextCodes.reduce((n, c) => n + (findCourse(c)?.credits ?? 3), 0) + nextSlots.length * 3;
  const laterCodes = Object.entries(PLAN_TERM)
    .filter(([, [y]]) => y >= 3)
    .map(([c]) => c);

  return (
    <div>
      <p className="type-small text-text-secondary">
        {t("eyebrow", {
          program: CS_PROGRAM.nameEn,
          programTh: CS_PROGRAM.nameTh,
          year: CS_PROGRAM.curriculumYear,
          credits: CS_PROGRAM.totalCredits,
        })}
      </p>
      <h1 className="type-h2 text-text md:type-h1">{t("title")}</h1>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label={t("title")}
          value="list"
          onChange={(v) => v === "graph" && router.push("/courses/graph")}
          options={[
            { value: "list", label: t("viewList") },
            { value: "graph", label: t("viewGraph") },
          ]}
        />
        <Button variant="outline" size="sm" className="self-start sm:self-auto" asChild>
          <Link href="/courses/what-if">{t("whatIf")}</Link>
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("title")}>
        {(
          [
            ["all", "filterAll"],
            ["can-take", "filterCanTake"],
            ["in-progress", "filterInProgress"],
            ["blocked", "filterBlocked"],
          ] as const
        ).map(([v, key]) => (
          <Chip key={v} check selected={filter === v} pop={FILTER_POP[v]} onClick={() => setFilter(v)}>
            {t(key)}
          </Chip>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-6">
        <div className="flex flex-col gap-4">
          <TermGroup
            key={`next-${filter}`}
            title={t("termTitle", { year: 2, sem: "2" })}
            tag={<Tag tone="matcha" dot>{t("tagNext")}</Tag>}
            meta={t("metaNext", { credits: nextCredits })}
            defaultOpen
            codes={nextCodes}
            slots={nextSlots}
            action={
              <Button size="sm" asChild>
                <Link href="/courses/plan">{t("planAction")}</Link>
              </Button>
            }
            filter={filter}
            status={st.status}
            missing={st.missing}
          />
          <TermGroup
            key={`now-${filter}`}
            title={t("termTitle", { year: 2, sem: "1" })}
            tag={<Tag tone="blue" dot>{t("tagCurrent")}</Tag>}
            meta={t("metaCurrent", { credits: student.currentCredits })}
            defaultOpen
            codes={codesIn(CURRENT_TERM)}
            filter={filter}
            status={st.status}
            missing={st.missing}
            grade={gradeIn(CURRENT_TERM)}
            editTerm={CURRENT_TERM}
          />
          {(["1-2", "1-1"] as const).map((k) => {
            const term = STUDENT_TERMS[k];
            const passed = passedIn(term);
            return (
              <TermGroup
                key={`${k}-${filter}`}
                title={t("termTitle", { year: Number(k[0]), sem: k[2] })}
                tag={<Tag tone="matcha" dot>{t("tagPassed")}</Tag>}
                meta={t("metaPassed", { count: passed.length, gpa: formatGpa(termGpa(records, term)) })}
                codes={codesIn(term)}
                filter={filter}
                status={st.status}
                missing={st.missing}
                grade={gradeIn(term)}
                editTerm={term}
              />
            );
          })}
          <TermGroup
            key={`later-${filter}`}
            title={t("laterTitle")}
            meta={t("metaLater", { credits: laterCodes.reduce((n, c) => n + (findCourse(c)?.credits ?? 3), 0) })}
            codes={laterCodes}
            filter={filter}
            status={st.status}
            missing={st.missing}
          />
          <p className="type-caption text-text-secondary">{t("footnote")}</p>
        </div>

        <aside className="flex flex-col gap-4 self-start">
          <Card className="flex flex-col gap-4">
            <div>
              <h2 className="type-h3 text-text">{t("creditsLeft")}</h2>
              <p className="type-small text-text-secondary">
                {t("creditsSummary", { passed: passedTotal, current: student.currentCredits, total: CS_PROGRAM.totalCredits })}
              </p>
            </div>
            {(Object.keys(CS_PROGRAM.creditTargets) as CreditCategory[]).map((cat, i) => {
              const target = CS_PROGRAM.creditTargets[cat];
              const passed = Math.min(student.byCategory[cat], target);
              const current = currentByCat[cat];
              const short = Math.max(0, target - passed);
              return (
                <div key={cat} style={{ "--i": i } as React.CSSProperties} className="stagger flex animate-rise-in flex-col gap-1.5">
                  <div className="flex items-center justify-between type-small-medium text-text">
                    <span>{tc(`category.${cat}`)}</span>
                    <span className={short === 0 ? "text-success" : undefined}>{short === 0 ? t("complete") : t("short", { count: short })}</span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-surface-alt">
                    <div
                      className={cn("absolute inset-y-0 left-0 origin-left animate-grow-x rounded-full opacity-35", BAR[cat])}
                      style={{ width: `${Math.min(100, ((passed + current) / target) * 100)}%` }}
                    />
                    <ProgressBar value={(passed / target) * 100} className="absolute inset-0 bg-transparent" barClassName={BAR[cat]} label={tc(`category.${cat}`)} />
                  </div>
                  <p className="type-caption text-text-secondary">{t("categoryMeta", { passed, current, target })}</p>
                </div>
              );
            })}
            <p className="type-caption text-text-secondary">
              {t("afterCurrent", { count: Math.max(0, CS_PROGRAM.totalCredits - passedTotal - student.currentCredits) })}
            </p>
          </Card>
          <Card className="pop-card flex flex-col gap-3 [--pop:var(--color-pop-matcha)]">
            <div>
              <h2 className="type-h3 text-text">{t("planCardTitle")}</h2>
              <p className="type-stat text-text">{tc("credits", { count: nextCredits })}</p>
              <p className="type-caption text-text-secondary">
                {t("planSummaryMeta", { count: nextCodes.length, min: TERM_CREDIT_RANGE.min, max: TERM_CREDIT_RANGE.max })}
              </p>
            </div>
            <ul className="flex flex-col gap-1.5 border-t border-border pt-3">
              {PLAN_ROWS.map(({ status, dot }) => {
                const count = nextCodes.filter((c) => st.status(c) === status).length;
                if (count === 0) return null;
                return (
                  <li key={status} className="flex items-center justify-between gap-3 type-small text-text">
                    <span className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", dot)} aria-hidden />
                      {tCourses(`status.${status}`)}
                    </span>
                    <span className="type-small-medium">{t("planSummaryCount", { count })}</span>
                  </li>
                );
              })}
              {nextSlots.length > 0 && (
                <li className="flex items-center justify-between gap-3 type-small text-text">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full border border-dashed border-border-strong" aria-hidden />
                    {t("notChosen")}
                  </span>
                  <span className="type-small-medium">{t("planSummarySlots", { count: nextSlots.length })}</span>
                </li>
              )}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function TermGroup({
  title,
  tag,
  meta,
  codes,
  slots = [],
  defaultOpen = false,
  filter,
  status,
  missing,
  grade,
  editTerm,
  action,
}: {
  title: string;
  tag?: React.ReactNode;
  meta: string;
  codes: string[];
  slots?: typeof PLAN_SLOTS;
  defaultOpen?: boolean;
  filter: Filter;
  status: (code: string) => CourseStatus;
  missing: (code: string) => string[];
  grade?: (code: string) => string | null;
  /** Set for terms already registered: their courses can be edited here. */
  editTerm?: TermId;
  /** Shown in the group's header, next to the collapse control. */
  action?: React.ReactNode;
}) {
  const t = useTranslations("courses.list");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const [adding, setAdding] = useState(false);
  const rows = codes.filter((c) => FILTER_MATCH[filter](status(c)));
  const showSlots = filter === "all" ? slots : [];

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      {/* The toggle stretches over the whole header (after:inset-0); the action sits above it. */}
      <div className="relative flex items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-hover md:px-5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left after:absolute after:inset-0"
        >
          <span className="type-h3 text-text">{title}</span>
          {tag}
          <span className="type-small text-text-secondary">· {meta}</span>
        </button>
        {action && <span className="relative z-[1] shrink-0">{action}</span>}
        <span className="pointer-events-none flex items-center gap-1 type-small-medium text-text" aria-hidden>
          <span className="hidden sm:inline">{open ? t("collapse") : t("expand")}</span>
          <ChevronDown className={cn("size-5 transition-transform duration-(--duration-base) ease-(--ease-bounce)", open && "rotate-180")} />
        </span>
      </div>
      {open && (
        <ul className="border-t border-border">
          {rows.length === 0 && showSlots.length === 0 && (
            <li className="animate-rise-in px-5 py-4 type-small text-text-muted">{t("noMatch")}</li>
          )}
          {rows.map((code, i) => {
            const c = findCourse(code);
            const s = status(code);
            const g = grade?.(code);
            const outcome = gradeOutcome(g);
            const OutcomeIcon = outcome && OUTCOME_ICON[outcome];
            const outOfPlan = !CURRICULUM_CODES.has(code) || !PLAN_TERM[code];
            const rowClass = "stagger animate-rise-in border-b border-border last:border-b-0";
            const rowStyle = { "--i": i } as React.CSSProperties;
            const link = (
                <Link
                  href={`/course/${code}`}
                  data-outcome={outcome ?? undefined}
                  className={cn("pop-row group flex items-center gap-3 px-4 py-3 transition-colors outline-none hover:bg-surface-hover focus-visible:bg-surface-hover md:gap-4 md:px-5", editTerm && "max-md:pr-14", c ? CATEGORY_STYLE[c.category].pop : "[--pop:var(--color-pop-pink)]")}
                >
                  <span data-mark className={cn("flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-transform group-hover:scale-125", outcome ? OUTCOME_MARK[outcome] : MARK[s])} aria-hidden>
                    {OutcomeIcon && <OutcomeIcon className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="hidden w-20 shrink-0 type-small text-text-secondary sm:block">{code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate type-small-medium text-text">{c?.nameEn ?? code}</span>
                    <span className="block truncate type-caption text-text-secondary">
                      <span className="sm:hidden">{code} · </span>
                      {locale === "th" && c ? c.nameTh : tc(`category.${c?.category ?? "free"}`)}
                      {outOfPlan && ` · ${t("outOfPlan")}`}
                    </span>
                  </span>
                  {g ? (
                    <span className="flex items-center gap-2">
                      {outcome && <OutcomeTag outcome={outcome} />}
                      <span data-grade className={cn("type-label", outcome ? OUTCOME_TEXT[outcome] : "text-primary-active")}>{g}</span>
                    </span>
                  ) : (
                    <StatusTag status={s} missing={missing(code)} />
                  )}
                  <span className={cn("hidden w-20 shrink-0 text-right type-small text-text-secondary md:block", editTerm && "term-credits")}>
                    {tc("credits", { count: c?.credits ?? 3 })}
                  </span>
                </Link>
            );
            return editTerm ? (
              <TermCourseRow key={code} term={editTerm} code={code} className={rowClass} style={rowStyle}>
                {link}
              </TermCourseRow>
            ) : (
              <li key={code} style={rowStyle} className={rowClass}>
                {link}
              </li>
            );
          })}
          {showSlots.map((slot, i) => (
            <li
              key={slot.labelKey}
              style={{ "--i": rows.length + i } as React.CSSProperties}
              className="stagger flex animate-rise-in items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 md:gap-4 md:px-5"
            >
              <span className="size-4 shrink-0 rounded-[4px] border border-dashed border-border-strong" aria-hidden />
              <span className="hidden w-20 shrink-0 type-small text-text-muted sm:block">{t("slot")}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate type-small-medium text-text">{t(slot.labelKey)}</span>
                <span className="block truncate type-caption text-text-secondary">{t(`${slot.labelKey}Sub`)}</span>
              </span>
              <Tag dot>{t("notChosen")}</Tag>
              <span className="hidden w-20 shrink-0 text-right type-small text-text-secondary md:block">{tc("credits", { count: 3 })}</span>
            </li>
          ))}
          {editTerm && filter === "all" && (
            <li>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left type-small-medium text-primary-active transition-colors outline-none hover:bg-primary-soft focus-visible:bg-primary-soft md:gap-4 md:px-5"
              >
                <Plus className="size-4 shrink-0 transition-transform duration-(--duration-base) ease-(--ease-bounce) group-hover:rotate-90 group-hover:scale-125" aria-hidden />
                {t("addToTerm")}
              </button>
            </li>
          )}
        </ul>
      )}
      {editTerm && <AddTermCourseDialog term={editTerm} open={adding} onOpenChange={setAdding} />}
    </section>
  );
}
