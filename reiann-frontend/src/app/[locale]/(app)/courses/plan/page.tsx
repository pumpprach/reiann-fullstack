"use client";

import { AlertTriangle, Check, ChevronRight, Info, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { burst } from "@/lib/confetti";
import { cn } from "cn";
import type { CourseStatus } from "@/core/courses";
import type { CreditCategory } from "@/core/types";
import { Card, Skeleton, Tag } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { CategoryTag } from "@/features/courses/category";
import { NoPlanYet, usePlan } from "@/features/courses/plan";
import { useCourseStatus } from "@/features/courses/status";
import { CourseCombobox } from "@/features/schedule/course-combobox";
import { useStudent } from "@/features/student";
import { Link } from "@/i18n/navigation";
import { PLAN_SLOTS, PLAN_TERM, TERM_CREDIT_RANGE } from "@/mocks/course-info";
import { CATALOG, CURRICULUM_CODES, findCourse } from "@/mocks/courses";
import { GE_COURSES } from "@/mocks/ge-courses";
import { CS_PROGRAM } from "@/mocks/programs";

/** Figma: Light / Courses / Plan Next Term. Route /courses/plan. */
export default function PlanNextTermPage() {
  const t = useTranslations("courses.plan");
  const plan = usePlan();
  if (plan.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!plan.hasPlan) return <NoPlanYet title={t("title")} />;
  // Keyed on the saved plan so the draft resets when it is saved elsewhere.
  return <PlanEditor key={plan.nextPlan.join()} initial={plan.nextPlan} />;
}

function PlanEditor({ initial }: { initial: string[] }) {
  const t = useTranslations("courses.plan");
  const tl = useTranslations("courses.list");
  const tc = useTranslations("common");
  const locale = useLocale();
  const plan = usePlan();
  const st = useCourseStatus();
  const student = useStudent();
  const [codes, setCodes] = useState(initial);
  const dirty = codes.join() !== initial.join();

  const courses = codes.map((c) => findCourse(c)).filter((c) => c !== undefined);
  const credits = courses.reduce((n, c) => n + c.credits, 0);
  const statuses = new Map(codes.map((c) => [c, st.status(c)] as const));
  const count = (pred: (s: CourseStatus) => boolean) => codes.filter((c) => pred(statuses.get(c)!)).length;

  const add = (code: string) => {
    if (codes.includes(code)) {
      toast(t("already", { code }));
      return;
    }
    setCodes((cs) => [...cs, code]);
    burst();
    toast.success(t("added", { code }));
  };
  const remove = (code: string) => {
    const before = codes;
    setCodes((cs) => cs.filter((c) => c !== code));
    toast(t("removed", { code }), { action: { label: t("undo"), onClick: () => setCodes(before) } });
  };
  const save = async () => {
    await plan.savePlan(codes);
    burst();
    toast.success(t("saved"));
  };

  // Suggestions that fill categories still short (electives first).
  const notTaken = (code: string) => !codes.includes(code) && !st.sets.passed.has(code) && !st.sets.inProgress.has(code);
  const suggestions = CATALOG.filter((c) => c.category === "elective" && notTaken(c.code) && st.status(c.code) !== "blocked")
    .sort((a, b) => Number(st.status(b.code) === "can-take") - Number(st.status(a.code) === "can-take"))
    .slice(0, 2);
  const slot = PLAN_SLOTS.find((s) => s.year === 2 && s.sem === 2 && s.category === "general");

  // "If you pass everything in this plan" (current courses counted as passed).
  const currentBy: Record<CreditCategory, number> = { general: 0, core: 0, required: 0, elective: 0, free: 0 };
  for (const r of student.current) {
    const c = findCourse(r.code);
    if (c) currentBy[c.category] += r.credits;
  }
  const planBy: Record<CreditCategory, number> = { general: 0, core: 0, required: 0, elective: 0, free: 0 };
  for (const c of courses) if (statuses.get(c.code) !== "passed" && statuses.get(c.code) !== "in-progress") planBy[c.category] += c.credits;
  const now = (cat: CreditCategory) => student.byCategory[cat] + currentBy[cat];
  const totalNow = (Object.keys(planBy) as CreditCategory[]).reduce((n, k) => n + now(k), 0);
  const totalPlan = (Object.keys(planBy) as CreditCategory[]).reduce((n, k) => n + planBy[k], 0);

  const tagFor = (code: string) => {
    const s = statuses.get(code)!;
    const missing = st.missing(code).join(", ");
    switch (s) {
      case "can-take":
        return <Tag tone="matcha" dot>{t("tagCanTake")}</Tag>;
      case "waiting":
        return <Tag tone="amber" dot>{t("tagIfPass", { codes: missing })}</Tag>;
      case "blocked":
        return <Tag tone="strawberry" dot>{t("tagBlocked", { codes: missing })}</Tag>;
      case "passed":
        return <Tag tone="strawberry" dot>{t("tagPassed")}</Tag>;
      case "in-progress":
        return <Tag tone="strawberry" dot>{t("tagInProgress")}</Tag>;
      default:
        return <Tag dot>{t("tagUnknown")}</Tag>;
    }
  };

  const checks: { Icon: typeof Check; tone: string; text: string }[] = [];
  const blocked = count((s) => s === "blocked");
  checks.push(
    blocked
      ? { Icon: AlertTriangle, tone: "text-error", text: t("checkBlocked", { count: blocked }) }
      : { Icon: Check, tone: "text-success", text: t("checkNoBlocked") },
  );
  const repeat = count((s) => s === "passed" || s === "in-progress");
  if (repeat) checks.push({ Icon: AlertTriangle, tone: "text-error", text: t("checkRepeat", { count: repeat }) });
  const ifPass = count((s) => s === "waiting");
  if (ifPass) checks.push({ Icon: AlertTriangle, tone: "text-warning", text: t("checkIfPass", { count: ifPass }) });
  const unknown = count((s) => s === "unknown");
  if (unknown) checks.push({ Icon: Info, tone: "text-text", text: t("checkUnknown", { count: unknown }) });
  if (credits > TERM_CREDIT_RANGE.max) checks.push({ Icon: AlertTriangle, tone: "text-warning", text: t("checkOver", { credits, max: TERM_CREDIT_RANGE.max }) });
  if (credits > 0 && credits < TERM_CREDIT_RANGE.min) checks.push({ Icon: Info, tone: "text-text", text: t("checkUnder", { credits, min: TERM_CREDIT_RANGE.min }) });
  checks.push({ Icon: Info, tone: "text-text", text: t("checkTime") });

  const creditTone = credits > TERM_CREDIT_RANGE.max ? "amber" : credits < TERM_CREDIT_RANGE.min ? "neutral" : "matcha";

  return (
    <div>
      <nav aria-label="breadcrumb" className="flex items-center gap-1 type-small text-text-secondary">
        <Link href="/courses" className="hover:text-text hover:underline">
          {tl("title")}
        </Link>
        <ChevronRight className="size-4" aria-hidden />
        <span>{t("crumb")}</span>
      </nav>
      <header className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="type-h2 text-text md:type-h1">{t("title")}</h1>
          <p className="mt-1 type-body text-text-secondary">{t("body")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={save} disabled={!dirty || plan.saving}>
            {t("save")}
          </Button>
          <Button
            onClick={async () => {
              if (dirty) await plan.savePlan(codes);
              toast(t("toScheduleToast"));
            }}
          >
            {t("toSchedule")}
          </Button>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="flex flex-col gap-3 self-start">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="type-h3 text-text">{t("chosen")}</h2>
              <Tag tone={creditTone} dot>
                <span key={credits} className="inline-block animate-pop-in">
                  {t("creditsTag", { credits })}
                </span>
              </Tag>
            </div>
            <p className="type-small text-text-secondary">{t("range", TERM_CREDIT_RANGE)}</p>
          </div>

          {courses.length === 0 && (
            <p className="rounded-md border border-dashed border-border-strong p-6 text-center type-small text-text-secondary">{t("empty")}</p>
          )}
          <ul className="flex flex-col gap-2">
            {courses.map((c, i) => (
              <li
                key={c.code}
                style={{ "--i": i } as React.CSSProperties}
                className="stagger flex animate-rise-in items-center gap-3 rounded-md bg-surface-alt px-4 py-3"
              >
                <Link href={`/course/${c.code}`} className="min-w-0 flex-1 outline-none hover:underline focus-visible:underline">
                  <span className="block truncate type-small-medium text-text">{c.nameEn}</span>
                  <span className="block truncate type-caption text-text-secondary">
                    {c.code} · {tc("credits", { count: c.credits })} ·{" "}
                    {PLAN_TERM[c.code]?.[0] === 2 && PLAN_TERM[c.code]?.[1] === 2 ? t("inPlan") : tc(`category.${c.category}`)}
                    {locale === "th" && ` · ${c.nameTh}`}
                  </span>
                </Link>
                <span className="hidden sm:inline-flex">{tagFor(c.code)}</span>
                <Button variant="ghost" size="sm" onClick={() => remove(c.code)} aria-label={`${t("remove")} ${c.code}`}>
                  <X className="sm:hidden" />
                  <span className="hidden sm:inline">{t("remove")}</span>
                </Button>
              </li>
            ))}
          </ul>

          <div className="mt-2 rounded-md border border-border p-4">
            <p className="mb-2 type-small-medium text-text">{t("check")}</p>
            <ul className="flex flex-col gap-1.5">
              {checks.map((c, i) => (
                <li
                  key={c.text}
                  style={{ "--i": i } as React.CSSProperties}
                  className="stagger flex animate-rise-in items-start gap-2 type-small text-text"
                >
                  <c.Icon className={cn("mt-0.5 size-4 shrink-0", c.tone)} aria-hidden />
                  {c.text}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <h2 className="type-h3 text-text">{t("add")}</h2>
            <CourseCombobox
              value=""
              onChange={add}
              label={t("add")}
              placeholder={t("search")}
              emptyText={t("noMatch")}
              groups={[
                {
                  label: t("groupCurriculum"),
                  courses: CATALOG.filter((c) => CURRICULUM_CODES.has(c.code) && notTaken(c.code)),
                },
                { label: t("groupGe"), courses: GE_COURSES.filter((g) => notTaken(g.code)) },
              ]}
            />
            <p className="mt-1 type-small text-text-secondary">{t("fill")}</p>
            {suggestions.map((c, i) => (
              <div
                key={c.code}
                style={{ "--i": i } as React.CSSProperties}
                className="stagger flex animate-rise-in items-center gap-3 rounded-md bg-surface-alt px-3 py-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate type-small-medium text-text">{c.nameEn}</span>
                  <span className="block truncate type-caption text-text-secondary">
                    {t("suggestSub", { code: c.code, category: tc(`category.${c.category}`), status: tl(`statusShort.${st.status(c.code)}`) })}
                  </span>
                </span>
                <Button variant="soft" size="sm" onClick={() => add(c.code)}>
                  <Plus />
                  {t("addBtn")}
                </Button>
              </div>
            ))}
            {slot && (
              <div className="flex items-center gap-3 rounded-md border border-dashed border-border-strong px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate type-small-medium text-text">{t("slotTitle", { credits: 3 })}</span>
                  <span className="block truncate type-caption text-text-secondary">{tl(`${slot.labelKey}Sub`)}</span>
                </span>
                <Button variant="soft" size="sm" asChild>
                  <Link href="/search?scope=ge">{t("pick")}</Link>
                </Button>
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="mb-1 type-h3 text-text">{t("ifAll")}</h2>
            {(["required", "elective", "general"] as const).map((cat) => (
              <div key={cat} className="flex items-center justify-between gap-3 type-small">
                <CategoryTag category={cat} />
                <span className="type-small-medium text-text">
                  {now(cat)} → <span className={cn(planBy[cat] > 0 && "text-primary")}>{now(cat) + planBy[cat]}</span> /{" "}
                  {CS_PROGRAM.creditTargets[cat]}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2 type-small">
              <span className="text-text-secondary">{t("total")}</span>
              <span className="type-small-medium text-text">
                {totalNow} → {totalNow + totalPlan} / {CS_PROGRAM.totalCredits}
              </span>
            </div>
            <p className="type-caption text-text-secondary">{t("ifAllNote")}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
