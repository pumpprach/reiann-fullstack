"use client";

import { ArrowDown, ArrowRight, BookOpen, Check, CalendarClock, ChevronRight, FileText, Lock, LockOpen, SearchX, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "cn";
import { parseCreditPattern, unlocks, type CourseStatus } from "@/core/courses";
import { overlaps, type ClassSlot, type Weekday } from "@/core/schedule";
import type { Course } from "@/core/types";
import { Card, Tag } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { useSlots } from "@/data/hooks";
import { useAddToPlan } from "@/features/courses/plan";
import { STATUS_ICON, StatusTag, useCourseStatus } from "@/features/courses/status";
import { Link } from "@/i18n/navigation";
import { splitTerm } from "@/lib/format";
import { PLAN_TERM, PREREQS, SAMPLE_REVIEW, SAMPLE_SECTIONS } from "@/mocks/course-info";
import { findCourse, PLAN_NEXT_TERM } from "@/mocks/courses";
import { GE_BY_CODE, GE_SOURCE } from "@/mocks/ge-courses";
import { CS_PROGRAM } from "@/mocks/programs";

/** Figma: Light / Course Overview. Route /course/[code] (frontend-flows §4.6b). */
export default function CourseOverviewPage() {
  const { code } = useParams<{ code: string }>();
  const course = findCourse(code);
  return course ? <Overview course={course} /> : <NotFound code={code} />;
}

function NotFound({ code }: { code: string }) {
  const t = useTranslations("courses.detail");
  return (
    <Card className="mx-auto mt-12 flex max-w-xl animate-pop-in flex-col items-center gap-3 py-12 text-center">
      <span className="inline-flex size-14 animate-float items-center justify-center rounded-lg bg-secondary-soft text-secondary-strong">
        <SearchX className="size-7" aria-hidden />
      </span>
      <h1 className="type-h2 text-text">{t("notFoundTitle", { code })}</h1>
      <p className="max-w-sm type-body text-text-secondary">{t("notFoundBody")}</p>
      <Button variant="outline" asChild>
        <Link href="/search">{t("backToSearch")}</Link>
      </Button>
    </Card>
  );
}

function Overview({ course }: { course: Course }) {
  const t = useTranslations("courses.detail");
  const tc = useTranslations("common");
  const locale = useLocale();
  const st = useCourseStatus();
  const planner = useAddToPlan();
  const slots = useSlots().data ?? [];

  const status = st.status(course.code);
  const missing = st.missing(course.code);
  const prereqs = PREREQS[course.code];
  const next = unlocks(course.code, PREREQS);
  const hours = parseCreditPattern(course.creditPattern);
  const plan = PLAN_TERM[course.code];
  const ge = GE_BY_CODE.get(course.code);
  const record = st.record(course.code);
  const ownSlots = slots.filter((s) => s.courseCode === course.code);
  const isBottleneck = next.length >= 2;
  const term = (id: Parameters<typeof splitTerm>[0]) => {
    const { year, sem } = splitTerm(id);
    return tc("term", { sem, year });
  };

  const primary =
    status === "in-progress" ? (
      <Button asChild>
        <Link href={`/calculator/${course.code}`}>{t("calculate")}</Link>
      </Button>
    ) : (status === "can-take" || status === "unknown" || status === "waiting") && PLAN_TERM[course.code]?.[0] !== 1 ? (
      planner.inPlan(course.code) ? (
        <Button variant="soft" asChild>
          <Link href="/courses/plan">
            <Check />
            {t("inPlan")}
          </Link>
        </Button>
      ) : (
        <Button onClick={() => planner.add(course.code)}>
          <Sparkles />
          {t("addToPlan")}
        </Button>
      )
    ) : (
      <Button variant="soft" asChild>
        <Link href={`/courses/graph?highlight=${course.code}`}>{t("viewGraph")}</Link>
      </Button>
    );

  // §4.6b: the 4th card shows unlocks instead of the timetable once passed.
  const statusCard =
    status === "passed"
      ? { value: t("statusPassed", { grade: record?.grade ?? "" }), sub: record ? t("statusPassedSub", { term: term(record.term) }) : "" }
      : status === "in-progress"
        ? { value: t("statusInProgress"), sub: t("statusInProgressSub", { term: term("2569/1") }) }
        : status === "can-take"
          ? { value: t("statusCanTake"), sub: t("statusCanTakeSub") }
          : status === "unknown"
            ? { value: t("statusUnknown"), sub: t("statusUnknownSub") }
            : { value: t(status === "waiting" ? "statusWaiting" : "statusBlocked"), sub: t("statusMissingSub", { codes: missing.join(", ") }) };

  const scheduleCard =
    status === "passed"
      ? { label: t("scheduleUnlocks"), value: t("scheduleUnlocksSub", { count: next.length }), sub: "" }
      : status === "in-progress"
        ? ownSlots.length
          ? { label: t("schedule"), value: t("scheduleIn"), sub: t("scheduleInSub", { count: ownSlots.length }) }
          : { label: t("schedule"), value: t("scheduleMissing"), sub: t("scheduleMissingSub") }
        : { label: t("schedule"), value: t("scheduleNot"), sub: t("scheduleNotSub") };

  const stats = [
    {
      Icon: BookOpen,
      tile: "bg-info-bg text-info",
      label: t("hours"),
      value: course.creditPattern ?? tc("credits", { count: course.credits }),
      sub: hours ? t("hoursDetail", hours) : "",
    },
    {
      Icon: FileText,
      tile: "bg-warning-bg text-warning",
      label: t("plan"),
      value: plan ? t("planValue", { year: plan[0], sem: String(plan[1]) }) : t("planNone"),
      sub: plan ? (PLAN_NEXT_TERM.includes(course.code) ? t("planNextTerm") : "") : ge?.geGroup ?? t("planNoneSub"),
    },
    {
      Icon: STATUS_ICON[status],
      tile: status === "blocked" ? "bg-secondary-soft text-secondary-strong" : "bg-primary-soft text-primary-active",
      label: t("yourStatus"),
      value: statusCard.value,
      sub: statusCard.sub,
    },
    { Icon: CalendarClock, tile: "bg-primary-soft text-primary-active", ...scheduleCard },
  ];

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1 type-small text-text-secondary">
            <Link href="/search" className="hover:text-text hover:underline">
              {t("breadcrumb")}
            </Link>
            <ChevronRight className="size-4" aria-hidden />
            <span>{t("crumb", { code: course.code, category: tc(`category.${course.category}`), year: CS_PROGRAM.curriculumYear })}</span>
          </nav>
          <h1 className="mt-1 type-h2 text-text md:type-h1">{course.nameEn}</h1>
          {locale === "th" && <p className="type-body text-text-secondary">{course.nameTh}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Tag dot>{tc("credits", { count: course.credits })}</Tag>
            <Tag dot>{tc(`category.${course.category}`)}</Tag>
            <StatusTag status={status} missing={missing} />
            {isBottleneck && (
              <Tag tone="strawberry" dot>
                {t("bottleneck")} · {t("unlockCount", { count: next.length })}
              </Tag>
            )}
            {course.gradingMode === "su" && <Tag tone="blue">S/U</Tag>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/soon/compare">{t("compare")}</Link>
          </Button>
          {primary}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => (
          <Card
            key={s.label}
            style={{ "--i": i } as React.CSSProperties}
            className="stagger lift flex animate-rise-in flex-col gap-1 p-4"
          >
            <p className="flex items-center gap-2 type-small text-text-secondary">
              <span className={cn("inline-flex size-7 items-center justify-center rounded-sm", s.tile)}>
                <s.Icon className="size-4" aria-hidden />
              </span>
              {s.label}
            </p>
            <p className="type-h3 text-text">{s.value}</p>
            {s.sub && <p className="type-caption text-text-secondary">{s.sub}</p>}
          </Card>
        ))}
      </div>

      <PrereqCard course={course} prereqs={prereqs} next={next} status={status} />
      <SectionsCard course={course} />
      <ReviewCard />

      <Card className="flex flex-col gap-3 border-dashed sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="type-h3 text-text">{t("fromStudents")}</h2>
          <p className="type-small text-text-secondary">{t("fromStudentsBody")}</p>
        </div>
        <Tag tone="amber" dot>
          {tc("comingSoon")}
        </Tag>
      </Card>

      <p className="type-caption text-text-secondary">{t("footnote")}</p>
    </div>
  );
}

function MiniCourse({
  code,
  tone,
  note,
  delay,
}: {
  code: string;
  tone: "passed" | "current" | "locked" | "neutral";
  note?: React.ReactNode;
  delay: number;
}) {
  const locale = useLocale();
  const tc = useTranslations("common");
  const c = findCourse(code);
  const cls = {
    passed: "border-primary-soft-hover bg-primary-soft",
    current: "border-2 border-primary bg-surface",
    locked: "border-dashed border-warning bg-surface",
    neutral: "border-border bg-surface",
  }[tone];
  const body = (
    <>
      <p className="type-caption text-text-secondary">
        {code} · {tc("credits", { count: c?.credits ?? 3 })}
      </p>
      <p className="type-small-medium text-text">{c?.nameEn ?? code}</p>
      {locale === "th" && c && <p className="type-caption text-text-secondary">{c.nameTh}</p>}
      {note && <div className="mt-2 type-caption text-text-secondary">{note}</div>}
    </>
  );
  return tone === "current" ? (
    <div style={{ "--i": delay } as React.CSSProperties} className={cn("stagger animate-pop-in rounded-md p-3", cls)}>
      {body}
    </div>
  ) : (
    <Link
      href={`/course/${code}`}
      style={{ "--i": delay } as React.CSSProperties}
      className={cn("stagger lift block animate-pop-in rounded-md border p-3 outline-none focus-visible:ring-3 focus-visible:ring-focus/30", cls)}
    >
      {body}
    </Link>
  );
}

function Arrow() {
  return (
    <span className="flex items-center justify-center text-primary" aria-hidden>
      <ArrowRight className="hidden size-5 animate-float md:block" />
      <ArrowDown className="size-5 animate-float md:hidden" />
    </span>
  );
}

function PrereqCard({ course, prereqs, next, status }: { course: Course; prereqs: string[] | undefined; next: string[]; status: CourseStatus }) {
  const t = useTranslations("courses.detail");
  const ts = useTranslations("courses");
  const st = useCourseStatus();
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="type-h3 text-text">{t("prereqTitle")}</h2>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/courses/graph?highlight=${course.code}`}>{t("viewGraph")}</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:gap-4">
        <div className="flex flex-col gap-2">
          <p className="type-small text-text-secondary">{t("mustPass")}</p>
          {prereqs === undefined ? (
            <p className="rounded-md border border-dashed border-border-strong p-3 type-small text-text-secondary">{t("noPrereqData")}</p>
          ) : prereqs.length === 0 ? (
            <p className="rounded-md bg-surface-alt p-3 type-small text-text-secondary">{t("noPrereq")}</p>
          ) : (
            prereqs.map((p, i) => {
              const s = st.status(p);
              const grade = st.record(p)?.grade;
              return (
                <MiniCourse
                  key={p}
                  code={p}
                  delay={i}
                  tone={s === "passed" ? "passed" : "neutral"}
                  note={
                    <span className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1">
                        {s === "passed" ? <LockOpen className="size-3.5" aria-hidden /> : <Lock className="size-3.5" aria-hidden />}
                        {ts(`status.${s}`)}
                      </span>
                      {grade && <span className="animate-pop-in type-h3 text-primary-active">{grade}</span>}
                    </span>
                  }
                />
              );
            })
          )}
        </div>
        <Arrow />
        <div className="flex flex-col gap-2">
          <p className="type-small text-text-secondary">{t("thisCourse")}</p>
          <MiniCourse
            code={course.code}
            tone="current"
            delay={2}
            note={
              <span className={cn("inline-flex items-center gap-1", status === "blocked" && "text-secondary-strong")}>
                {(() => {
                  const I = STATUS_ICON[status];
                  return <I className="size-3.5" aria-hidden />;
                })()}
                {ts(`status.${status}`)}
              </span>
            }
          />
        </div>
        <Arrow />
        <div className="flex flex-col gap-2">
          <p className="type-small text-text-secondary">{t("next")}</p>
          {next.length === 0 ? (
            <p className="rounded-md bg-surface-alt p-3 type-small text-text-secondary">{t("noUnlocks")}</p>
          ) : (
            next.map((n, i) => (
              <MiniCourse
                key={n}
                code={n}
                delay={3 + i}
                tone={st.status(n) === "passed" ? "passed" : "locked"}
                note={
                  <span className="inline-flex items-center gap-1 text-warning">
                    <Lock className="size-3.5" aria-hidden />
                    {t("needs", { code: course.code })}
                  </span>
                }
              />
            ))
          )}
        </div>
      </div>
      <p className="type-caption text-text-secondary">{t("prereqNote")}</p>
    </Card>
  );
}

function SectionsCard({ course }: { course: Course }) {
  const t = useTranslations("courses.detail");
  const tc = useTranslations("common");
  const ge = GE_BY_CODE.get(course.code);
  const sample = SAMPLE_SECTIONS[course.code];

  // These sections are for next term, so compare them with the other courses
  // planned for next term, not with this term's timetable.
  const others: ClassSlot[] = PLAN_NEXT_TERM.filter((c) => c !== course.code).flatMap((c) =>
    (SAMPLE_SECTIONS[c] ?? []).map((s) => ({ id: `${c}-${s.no}`, courseCode: c, section: s.no, day: s.day as Weekday, start: s.start, end: s.end, kind: s.kind })),
  );

  const rows = ge
    ? ge.sections.map((s) => ({ no: s.no, kind: s.kind, time: null as string | null, seats: s.seats, clash: null as ClassSlot | null }))
    : (sample ?? []).map((s) => {
        const slot = { id: s.no, courseCode: course.code, day: s.day as Weekday, start: s.start, end: s.end, kind: s.kind };
        return {
          no: s.no,
          kind: s.kind,
          time: `${tc(`day.${s.day}` as "day.0")} ${s.start}–${s.end}`,
          seats: null as number | null,
          clash: others.find((o) => overlaps(slot, o)) ?? null,
        };
      });

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="type-h3 text-text">{t("sectionsTitle")}</h2>
        {!ge && (
          <Tag tone="amber" dot>
            {tc("demoTag")}
          </Tag>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md bg-surface-alt p-4 type-small text-text-secondary">{t("sectionsEmpty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[520px] text-left type-small">
            <thead className="bg-surface-alt text-text-secondary">
              <tr>
                <th className="px-4 py-2.5 font-medium">{t("sectionNo")}</th>
                <th className="px-4 py-2.5 font-medium">{t("sectionKind")}</th>
                <th className="px-4 py-2.5 font-medium">{t("sectionTime")}</th>
                <th className="px-4 py-2.5 font-medium">{ge ? t("sectionSeats") : t("sectionCompare")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.no}
                  style={{ "--i": i } as React.CSSProperties}
                  className="stagger animate-rise-in border-t border-border text-text"
                >
                  <td className="px-4 py-3">{r.no}</td>
                  <td className="px-4 py-3">{t(r.kind)}</td>
                  <td className="px-4 py-3">{r.time ?? <span className="text-text-secondary">{t("timeUnknown")}</span>}</td>
                  <td className="px-4 py-3">
                    {r.seats !== null ? (
                      r.seats
                    ) : r.clash ? (
                      <Tag tone="strawberry" dot>
                        {t("clash", { code: `${r.clash.courseCode}${r.clash.section ? ` ${t("sectionNo")} ${r.clash.section}` : ""}` })}
                      </Tag>
                    ) : (
                      <Tag tone="matcha" dot>
                        {t("noClash")}
                      </Tag>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="type-caption text-text-secondary">
        {ge ? t("sectionsGeNote", { source: new URL(GE_SOURCE.url).host }) : t("sectionsNote")}
      </p>
    </Card>
  );
}

function ReviewCard() {
  const t = useTranslations("courses.detail");
  const tc = useTranslations("common");
  const r = SAMPLE_REVIEW;
  const items = [
    { label: t("overall"), value: String(r.overall), sub: t("overallSub", { count: r.count }) },
    { label: t("difficulty"), value: t("outOf", { value: r.difficulty }), sub: t("difficultySub") },
    { label: t("workload"), value: t("outOf", { value: r.workload }), sub: t("workloadSub") },
    { label: t("worth"), value: t("outOf", { value: r.worth }), sub: t("worthSub") },
  ];
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="type-h3 text-text">{t("reviewTitle")}</h2>
          <Tag tone="amber" dot>
            {tc("demoTag")}
          </Tag>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/soon/reviews">{t("readReviews")}</Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((it, i) => (
          <div
            key={it.label}
            style={{ "--i": i } as React.CSSProperties}
            className="stagger animate-pop-in rounded-md bg-surface-alt p-4"
          >
            <p className="type-small text-text-secondary">{it.label}</p>
            <p className="type-stat text-text">{it.value}</p>
            <p className="type-caption text-text-secondary">{it.sub}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
