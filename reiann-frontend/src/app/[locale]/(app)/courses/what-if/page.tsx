"use client";

import { ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useState } from "react";
import { cn } from "cn";
import { LAST_TERM, simulateDelay, termAt, termIndex } from "@/core/plan";
import { Card, Chip, Skeleton, Tag } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { CURRENT_INDEX, NEXT_INDEX, NoPlanYet, usePlan } from "@/features/courses/plan";
import { useCourseStatus } from "@/features/courses/status";
import { CourseCombobox } from "@/features/schedule/course-combobox";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { PLAN_SLOTS, PLAN_TERM, PREREQS, TERM_CREDIT_RANGE } from "@/mocks/course-info";
import { findCourse } from "@/mocks/courses";

type Scenario = "fail" | "skip" | "withdraw";
const COOP = "01418490";

// useSearchParams needs a Suspense boundary so the page can still prerender.
export default function WhatIfPage() {
  return (
    <Suspense>
      <WhatIf />
    </Suspense>
  );
}

/** Figma: Light / Courses / What-if. Route /courses/what-if?course=… */
function WhatIf() {
  const t = useTranslations("courses.whatIf");
  const tl = useTranslations("courses.list");
  const tco = useTranslations("courses");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const plan = usePlan();
  const st = useCourseStatus();

  const inProgress = [...st.sets.inProgress].sort();
  const later = Object.keys(PLAN_TERM)
    .filter((c) => !st.sets.passed.has(c) && !st.sets.inProgress.has(c))
    .sort((a, b) => termIndex(PLAN_TERM[a]) - termIndex(PLAN_TERM[b]) || a.localeCompare(b));
  const fallback = inProgress.find((c) => PLAN_TERM[c]) ?? inProgress[0] ?? later[0] ?? "";
  const code = params.get("course") ?? fallback;
  const current = st.sets.inProgress.has(code);
  const [picked, setScenario] = useState<Scenario>("fail");
  // "Not taken as planned" only fits a course that is not in progress.
  const scenario: Scenario = current && picked === "skip" ? "fail" : picked;

  if (plan.isPending || st.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!plan.hasPlan) return <NoPlanYet title={t("title")} />;

  const course = findCourse(code);
  const passed = st.sets.passed.has(code);
  const plannedIdx = PLAN_TERM[code] ? termIndex(PLAN_TERM[code]) : null;
  // Fail or W this term → retake next term. A future course pushed one term past its plan.
  const earliest = current ? CURRENT_INDEX + 1 : Math.max(plannedIdx ?? NEXT_INDEX, NEXT_INDEX) + 1;
  const rows = course && !passed ? simulateDelay(code, earliest, PLAN_TERM, PREREQS) : [];
  // Other courses pushed later (the chosen course itself is not counted).
  const shifted = rows.filter((r) => r.shift > 0 && r.code !== code);
  const graduatesOnTime = rows.every((r) => r.earliest <= LAST_TERM);

  const termName = (i: number | null) => {
    if (i === null) return "–";
    if (i > LAST_TERM) return t("beyond");
    const [year, sem] = termAt(i);
    return tco("termName", { year, sem: String(sem) });
  };
  const loadAt = (i: number) =>
    Object.entries(PLAN_TERM)
      .filter(([, p]) => termIndex(p) === i)
      .reduce((n, [c]) => n + (findCourse(c)?.credits ?? 3), 0) +
    PLAN_SLOTS.filter((s) => termIndex([s.year, s.sem]) === i).length * 3;
  const loadFrom = loadAt(earliest);
  const loadTo = loadFrom + (course?.credits ?? 0);
  const coopHit = shifted.some((r) => r.code === COOP);

  const setCode = (c: string) => router.replace(`${pathname}?course=${c}`, { scroll: false });

  return (
    <div>
      <nav aria-label="breadcrumb" className="flex items-center gap-1 type-small text-text-secondary">
        <Link href="/courses" className="hover:text-text hover:underline">
          {tl("title")}
        </Link>
        <ChevronRight className="size-4" aria-hidden />
        <span>{t("crumb")}</span>
      </nav>
      <h1 className="mt-1 type-h2 text-text md:type-h1">{t("title")}</h1>
      <p className="mt-1 type-body text-text-secondary">{t("body")}</p>

      <Card className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="flex flex-col gap-1.5">
          <p className="type-small-medium text-text">{t("course")}</p>
          <CourseCombobox
            value={code}
            onChange={setCode}
            label={t("course")}
            placeholder={t("search")}
            emptyText={t("noMatch")}
            groups={[
              { label: t("groupNow"), courses: inProgress.map((c) => findCourse(c)).filter((c) => c !== undefined) },
              { label: t("groupLater"), courses: later.map((c) => findCourse(c)).filter((c) => c !== undefined) },
            ]}
          />
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 type-small-medium text-text">{t("scenario")}</legend>
          <div className="flex flex-wrap gap-2">
            {(["fail", "skip", "withdraw"] as const).map((s) => (
              <Chip key={s} check selected={scenario === s} disabled={s === "skip" && current} onClick={() => setScenario(s)} className="disabled:opacity-40">
                {t(s)}
              </Chip>
            ))}
          </div>
        </fieldset>
      </Card>

      {passed ? (
        <Card className="mt-5 animate-pop-in text-center type-body text-text-secondary">{t("passedNote")}</Card>
      ) : course ? (
        <section
          key={`${code}-${scenario}`}
          className={cn(
            "mt-5 flex animate-pop-in flex-col gap-4 rounded-lg border-2 bg-surface p-5 md:p-6",
            graduatesOnTime ? "border-warning" : "border-error",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="type-h2 text-text">
              {shifted.length === 0 ? t("resultNone") : t("resultTitle", { count: shifted.length, grad: graduatesOnTime ? "ok" : "late" })}
            </h2>
            <Tag tone="amber" dot>
              {t("retakeTag", { term: termName(earliest) })}
            </Tag>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[560px] text-left type-small">
              <thead className="bg-surface-alt text-text-secondary">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t("colCourse")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("colPlan")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("colEarliest")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("colResult")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.code} style={{ "--i": i } as React.CSSProperties} className="stagger animate-rise-in border-t border-border text-text">
                    <td className="px-4 py-3">
                      <Link href={`/course/${r.code}`} className="hover:underline">
                        {r.code} {findCourse(r.code)?.nameEn}
                      </Link>{" "}
                      {r.code === code && <span className="text-text-secondary">{scenario === "skip" ? t("later") : t("retake")}</span>}
                    </td>
                    <td className="px-4 py-3">{termName(r.planned)}</td>
                    <td className="px-4 py-3">{termName(r.earliest)}</td>
                    <td className="px-4 py-3">
                      {r.shift > 0 ? (
                        <Tag tone={r.earliest > LAST_TERM ? "strawberry" : "amber"} dot>
                          {t("shift", { count: r.shift })}
                        </Tag>
                      ) : (
                        <Tag tone="matcha" dot>
                          {t("same")}
                        </Tag>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Stat
              i={0}
              label={termName(earliest)}
              value={t("loadValue", { from: loadFrom, to: loadTo })}
              sub={loadTo > TERM_CREDIT_RANGE.max ? t("loadOver", { max: TERM_CREDIT_RANGE.max }) : t("loadOk", { max: TERM_CREDIT_RANGE.max })}
              warn={loadTo > TERM_CREDIT_RANGE.max}
            />
            <Stat i={1} label={t("coopTitle")} value={coopHit ? t("coopHit") : t("coopOk")} sub={coopHit ? t("coopHitSub") : t("coopOkSub")} warn={coopHit} />
            <Stat
              i={2}
              label={t("gpaTitle")}
              value={scenario === "fail" ? t("gpaDown") : t("gpaSame")}
              sub={scenario === "fail" ? t("gpaDownSub", { credits: course.credits }) : scenario === "withdraw" ? t("gpaSameW") : t("gpaSameSkip")}
              warn={scenario === "fail"}
            />
          </div>
          <p className="type-caption text-text-secondary">{t("assume")}</p>
        </section>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href={`/courses/graph?highlight=${code}`}>{t("viewGraph")}</Link>
        </Button>
        <Button asChild>
          <Link href="/courses/plan">{t("planNext")}</Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({ i, label, value, sub, warn }: { i: number; label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div style={{ "--i": i } as React.CSSProperties} className="stagger animate-rise-in rounded-md bg-surface-alt p-4">
      <p className="type-small text-text-secondary">{label}</p>
      <p className={cn("type-label", warn ? "text-warning" : "text-text")}>{value}</p>
      <p className="type-caption text-text-secondary">{sub}</p>
    </div>
  );
}
