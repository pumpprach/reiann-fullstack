"use client";

import { Check, Clock3, Info, Lock, LockOpen, Plus, Waypoints, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { unlocks, type CourseStatus } from "@/core/courses";
import { LAST_TERM, termAt, termIndex } from "@/core/plan";
import { Banner, Card, Chip, Segmented, Skeleton, Tag } from "@/components/reiann";
import { FILTER_POP } from "@/features/courses/category";
import { Button } from "@/components/ui/button";
import { CourseSheet } from "@/features/courses/course-sheet";
import { CURRENT_INDEX, NoPlanYet, usePlan } from "@/features/courses/plan";
import { useCourseStatus, gradeOutcome, OUTCOME_ICON, OUTCOME_TEXT, type GradeOutcome } from "@/features/courses/status";
import { useStudent } from "@/features/student";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { PLAN_SLOTS, PLAN_TERM, PREREQS, STUDENT_TERMS } from "@/mocks/course-info";
import { findCourse } from "@/mocks/courses";
import { CS_PROGRAM } from "@/mocks/programs";

type Filter = "all" | "can-take" | "in-progress" | "blocked";
const FILTER_MATCH: Record<Filter, (s: CourseStatus) => boolean> = {
  all: () => true,
  "can-take": (s) => s === "can-take",
  "in-progress": (s) => s === "in-progress",
  blocked: (s) => s === "blocked" || s === "waiting",
};

const CARD: Record<CourseStatus, string> = {
  passed: "border-primary-soft-hover bg-primary-soft",
  "in-progress": "border-info/40 bg-info-bg",
  "can-take": "border-2 border-primary bg-surface",
  waiting: "border-dashed border-warning bg-surface",
  blocked: "border-dashed border-warning bg-surface",
  unknown: "border-dashed border-border-strong bg-surface",
};
const OFF_PLAN = "border-career/50 bg-career-bg";
const OUTCOME_CARD: Record<GradeOutcome, string> = {
  failed: "border-error bg-error-bg [--glow:var(--color-danger)]",
  withdrawn: "border-dashed border-border-strong bg-surface-alt [--glow:var(--color-text-secondary)]",
  incomplete: "border-warning bg-warning-bg [--glow:var(--color-warning)]",
};

const STATUS_ICON: Record<CourseStatus, typeof Check> = {
  passed: Check,
  "in-progress": Clock3,
  "can-take": LockOpen,
  waiting: Lock,
  blocked: Lock,
  unknown: Info,
};

// useSearchParams needs a Suspense boundary so the page can still prerender.
export default function CurriculumGraphPage() {
  return (
    <Suspense>
      <Graph />
    </Suspense>
  );
}

/** Figma: Light / Curriculum Graph (+ Highlight Path, Graph Overlay). Route /courses/graph. */
function Graph() {
  const t = useTranslations("courses.list");
  const tg = useTranslations("courses.graph");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const plan = usePlan();
  const st = useCourseStatus();
  const student = useStudent();
  const [filter, setFilter] = useState<Filter>("all");

  const openCode = params.get("course");
  const highlight = params.get("highlight");

  const setQuery = useCallback(
    (next: { course?: string | null; highlight?: string | null }) => {
      const q = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v) q.set(k, v);
        else q.delete(k);
      }
      const s = q.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // Columns: planned courses, courses taken outside the plan, and open slots.
  const columns = useMemo(() => {
    const latestTerm = new Map<string, string>();
    for (const r of student.records) latestTerm.set(r.code, r.term);
    return Array.from({ length: LAST_TERM + 1 }, (_, i) => {
      const [year, sem] = termAt(i);
      const termId = STUDENT_TERMS[`${year}-${sem}`];
      const planned = Object.entries(PLAN_TERM)
        .filter(([, p]) => termIndex(p) === i)
        .map(([c]) => c)
        .sort();
      const offPlan = [...latestTerm.entries()]
        .filter(([code, term]) => term === termId && !PLAN_TERM[code])
        .map(([code]) => code)
        .sort();
      const slots = PLAN_SLOTS.filter((s) => s.year === year && s.sem === sem);
      const credits = planned.reduce((n, c) => n + (findCourse(c)?.credits ?? 3), 0) + slots.length * 3;
      return { i, year, sem, planned, offPlan, slots, credits };
    });
  }, [student.records]);

  const totalCredits = CS_PROGRAM.totalCredits;
  const highlightSet = useMemo(
    () => (highlight ? new Set([highlight, ...(PREREQS[highlight] ?? []), ...unlocks(highlight, PREREQS)]) : null),
    [highlight],
  );

  if (plan.isPending || st.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }
  if (!plan.hasPlan) return <NoPlanYet title={tg("noPlanTitle")} />;

  const dimmed = (code: string) =>
    (highlightSet ? !highlightSet.has(code) : false) || !FILTER_MATCH[filter](st.status(code));

  // Summary cards under the board.
  const allPlanned = Object.keys(PLAN_TERM);
  const canTake = allPlanned.filter((c) => st.status(c) === "can-take");
  const inProgress = [...st.sets.inProgress];
  const gating = inProgress.filter((c) => unlocks(c, PREREQS).some((n) => !st.sets.passed.has(n)));
  const gated = [...new Set(gating.flatMap((c) => unlocks(c, PREREQS)))].sort();
  const bottleneck = allPlanned
    .filter((c) => !st.sets.passed.has(c) && !st.sets.inProgress.has(c))
    .map((c) => ({ c, n: unlocks(c, PREREQS) }))
    .filter((x) => x.n.length >= 2)
    .sort((a, b) => b.n.length - a.n.length || termIndex(PLAN_TERM[a.c]) - termIndex(PLAN_TERM[b.c]))[0];

  const hl = highlight ? findCourse(highlight) : undefined;

  return (
    <div>
      <p className="type-small text-text-secondary">
        {t("eyebrow", { program: CS_PROGRAM.nameEn, programTh: CS_PROGRAM.nameTh, year: CS_PROGRAM.curriculumYear, credits: totalCredits })}
      </p>
      <h1 className="type-h2 text-text md:type-h1">{t("title")}</h1>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label={t("title")}
          value="graph"
          onChange={(v) => v === "list" && router.push("/courses")}
          options={[
            { value: "list", label: t("viewList") },
            { value: "graph", label: t("viewGraph") },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/courses/what-if">{t("whatIf")}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/courses/plan">{t("planNext")}</Link>
          </Button>
        </div>
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

      <Banner tone="info" className="mt-4 lg:hidden">
        {tg("narrow")}
      </Banner>

      <Card className="mt-4 flex flex-col gap-4 p-4 md:p-5">
        <Legend />
        {hl && (
          <div className="flex animate-rise-in flex-wrap items-center justify-between gap-3 rounded-md bg-secondary-soft px-4 py-3">
            <p className="type-small-medium text-text">
              {tg("highlightBanner", {
                code: hl.code,
                name: hl.nameEn,
                before: (PREREQS[hl.code] ?? []).length,
                after: unlocks(hl.code, PREREQS).length,
              })}
            </p>
            <Button variant="outline" size="sm" onClick={() => setQuery({ highlight: null })}>
              <X />
              {tg("clearHighlight")}
            </Button>
          </div>
        )}
        <Board
          columns={columns}
          status={st.status}
          grade={(c) => st.record(c)?.grade ?? null}
          dimmed={dimmed}
          highlight={highlightSet}
          focus={highlight}
          onOpen={(code) => setQuery({ course: code })}
          totalCredits={totalCredits}
        />
        <p className="type-caption text-text-secondary">{tg("footnote")}</p>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-y-1.5">
        <SummaryCard
          i={0}
          Icon={LockOpen}
          tile="bg-primary-soft text-primary-active"
          label={tg("sumCanTake")}
          value={tg("sumCanTakeValue", { count: canTake.length })}
          caption={canTake.length ? tg("sumCanTakeBody") : tg("none")}
          codes={canTake}
          onClick={() => setFilter("can-take")}
        />
        <SummaryCard
          i={1}
          Icon={Clock3}
          tile="bg-secondary-soft text-secondary-strong"
          label={tg("sumWaiting")}
          value={tg("sumWaitingValue", { count: inProgress.length })}
          caption={gating.length ? tg("sumWaitingBody", { codes: gating.join(" และ ") }) : tg("none")}
          codes={gated}
          onClick={() => setFilter("in-progress")}
        />
        <SummaryCard
          i={2}
          Icon={Waypoints}
          tile="bg-info-bg text-info"
          label={tg("sumBottleneck")}
          value={bottleneck ? tg("sumBottleneckValue", { code: bottleneck.c, count: bottleneck.n.length }) : tg("none")}
          caption={bottleneck ? tg("sumBottleneckBody") : ""}
          codes={bottleneck?.n ?? []}
          onClick={bottleneck ? () => setQuery({ highlight: bottleneck.c, course: null }) : undefined}
        />
      </div>
      <p className="mt-5 type-caption text-text-secondary">{tg("privacy")}</p>

      <CourseSheet
        code={openCode}
        onClose={() => setQuery({ course: null })}
        highlighted={!!openCode && highlight === openCode}
        onHighlight={(c) => setQuery({ highlight: c, course: null })}
      />
    </div>
  );
}

function Legend() {
  const t = useTranslations("courses.graph");
  const box = (cls: string) => <span className={cn("inline-block size-3.5 rounded-[4px] border", cls)} aria-hidden />;
  const items: [React.ReactNode, string][] = [
    [box("border-primary-soft-hover bg-primary-soft"), t("legendPassed")],
    [box("border-info/40 bg-info-bg"), t("legendInProgress")],
    [box("border-2 border-primary"), t("legendCanTake")],
    [box("border-dashed border-warning"), t("legendBlocked")],
    [box("border-dashed border-border-strong"), t("legendUnknown")],
    [box(OFF_PLAN), t("legendOffPlan")],
    [box("border-dashed border-border-strong bg-surface-alt"), t("legendSlot")],
    [<Lock key="l" className="size-3.5 text-secondary-strong" aria-hidden />, t("legendBottleneck")],
    [<span key="e1" className="inline-block h-0.5 w-6 rounded bg-primary" aria-hidden />, t("legendEdgeDone")],
    [<span key="e2" className="inline-block h-0.5 w-6 rounded bg-border-strong" aria-hidden />, t("legendEdgeTodo")],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 type-caption text-text-secondary">
      {items.map(([icon, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          {icon}
          {label}
        </span>
      ))}
      <span className="text-text-muted">{t("legendHint")}</span>
    </div>
  );
}

type Column = {
  i: number;
  year: number;
  sem: 1 | 2;
  planned: string[];
  offPlan: string[];
  slots: typeof PLAN_SLOTS;
  credits: number;
};

const COL_W = 252;
const COL_GAP = 72;

/** Hover a card: light up its lines and the courses on either side (no React re-render). */
function setHot(board: HTMLElement, code: string | null) {
  if (board.dataset.hot === (code ?? "")) return;
  board.dataset.hot = code ?? "";
  for (const el of board.querySelectorAll<HTMLElement>("[data-rel]")) delete el.dataset.rel;
  for (const el of board.querySelectorAll<SVGPathElement>("path[data-hot]")) el.removeAttribute("data-hot");
  if (!code) {
    delete board.dataset.hovering;
    return;
  }
  board.dataset.hovering = "";
  const mark = (c: string, rel: string) => {
    const el = board.querySelector<HTMLElement>(`[data-course="${c}"]`);
    if (el) el.dataset.rel = rel;
  };
  for (const p of PREREQS[code] ?? []) mark(p, "pre");
  for (const n of unlocks(code, PREREQS)) mark(n, "next");
  // Lines share trunks, so move the lit ones to the end of the group to draw them on top.
  for (const el of board.querySelectorAll<SVGPathElement>(`path[data-to="${code}"]`)) {
    el.setAttribute("data-hot", "in");
    el.parentNode?.appendChild(el);
  }
  for (const el of board.querySelectorAll<SVGPathElement>(`path[data-from="${code}"]`)) {
    el.setAttribute("data-hot", "out");
    el.parentNode?.appendChild(el);
  }
}

/** Hover glow colour per card state. */
const GLOW: Record<CourseStatus, string> = {
  passed: "[--glow:var(--color-primary)]",
  "in-progress": "[--glow:var(--color-info)]",
  "can-take": "[--glow:var(--color-primary)]",
  waiting: "[--glow:var(--color-warning)]",
  blocked: "[--glow:var(--color-warning)]",
  unknown: "[--glow:var(--color-text-secondary)]",
};

function Board({
  columns,
  status,
  grade,
  dimmed,
  highlight,
  focus,
  onOpen,
  totalCredits,
}: {
  columns: Column[];
  status: (c: string) => CourseStatus;
  grade: (c: string) => string | null;
  dimmed: (c: string) => boolean;
  highlight: Set<string> | null;
  focus: string | null;
  onOpen: (c: string) => void;
  totalCredits: number;
}) {
  const t = useTranslations("courses.graph");
  const tcourses = useTranslations("courses");
  const tl = useTranslations("courses.list");
  const tc = useTranslations("common");
  const scrollRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Draw prerequisite lines in the gutters between term columns (Figma: lines
  // never cross a card). The SVG sits behind the columns, so a line that spans
  // several terms only shows in the gaps. Done directly on the SVG (no React
  // state) because positions are only known after layout. Offsets are used
  // instead of getBoundingClientRect so entry animations (scale) don't skew them.
  useLayoutEffect(() => {
    const board = boardRef.current;
    const svg = svgRef.current;
    if (!board || !svg) return;
    const draw = () => {
      svg.setAttribute("width", String(board.scrollWidth));
      svg.setAttribute("height", String(board.scrollHeight));
      const at = (code: string) => {
        const el = board.querySelector<HTMLElement>(`[data-course="${code}"]`);
        const col = el?.closest<HTMLElement>("[data-col]");
        if (!el || !col) return null;
        return {
          col: Number(col.dataset.col),
          left: col.offsetLeft,
          right: col.offsetLeft + col.offsetWidth,
          y: col.offsetTop + el.offsetTop + Math.min(el.offsetHeight / 2, 40),
        };
      };
      type Edge = { from: string; to: string; x1: number; y1: number; x2: number; y2: number; gutter: number; done: boolean };
      const edges: Edge[] = [];
      for (const [code, list] of Object.entries(PREREQS)) {
        const to = at(code);
        if (!to) continue;
        for (const p of list) {
          const from = at(p);
          if (!from || from.col >= to.col) continue;
          edges.push({ from: p, to: code, x1: from.right, y1: from.y, x2: to.left, y2: to.y, gutter: to.col, done: status(p) === "passed" });
        }
      }
      // One vertical "trunk" per source course in each gutter: every line from
      // that course shares it and branches off at its target, so a course that
      // unlocks several others reads as one tidy tree instead of parallel lines.
      // Lower sources sit further left, so a downward fan doesn't cross the
      // trunks of courses below it.
      const lanes = new Map<string, number>();
      for (const g of new Set(edges.map((e) => e.gutter))) {
        const sources = [...new Map(edges.filter((e) => e.gutter === g).map((e) => [e.from, e.y1])).entries()].sort((a, b) => b[1] - a[1]);
        sources.forEach(([from], k) => lanes.set(`${g}:${from}`, sources.length === 1 ? 0.5 : k / (sources.length - 1)));
      }
      // Lanes stay clear of both gutter edges: the last LEAD px before the
      // column are always a straight horizontal run, so the arrowhead (which
      // takes the angle of the path's end) never tilts or lands on a bend.
      const R = 8;
      const PAD = 10;
      const LEAD = 18;
      const parts = edges.map((e) => {
        const gutterLeft = e.x2 - COL_GAP;
        const xl = gutterLeft + PAD + R + (COL_GAP - PAD - LEAD - 2 * R) * lanes.get(`${e.gutter}:${e.from}`)!;
        const dy = e.y2 - e.y1;
        const s = Math.sign(dy);
        const end = `H${e.x2 - 1}`;
        let d: string;
        if (Math.abs(dy) < 1) d = `M${e.x1},${e.y1} ${end}`;
        else if (Math.abs(dy) < 2 * R)
          // Small step: one smooth S-curve instead of two cramped corners.
          d = `M${e.x1},${e.y1} H${xl - R} C${xl},${e.y1} ${xl},${e.y2} ${xl + R},${e.y2} ${end}`;
        else
          d = `M${e.x1},${e.y1} H${xl - R} Q${xl},${e.y1} ${xl},${e.y1 + s * R} V${e.y2 - s * R} Q${xl},${e.y2} ${xl + R},${e.y2} ${end}`;
        const on = highlight ? highlight.has(e.to) && highlight.has(e.from) : true;
        const color = e.done ? "var(--color-primary)" : "var(--color-border-strong)";
        return `<path d="${d}" data-from="${e.from}" data-to="${e.to}" fill="none" stroke="${color}" stroke-width="${on && highlight ? 2.5 : 1.75}" stroke-linecap="round" stroke-linejoin="round" opacity="${on ? 1 : 0.15}" class="graph-edge" marker-end="url(#${e.done ? "arrow-done" : "arrow-todo"})"/>`;
      });
      svg.querySelector("g")!.innerHTML = parts.join("");
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(board);
    return () => ro.disconnect();
  }, [columns, highlight, status]);

  // Bring a highlighted course into view (e.g. arriving from "ดูในกราฟวิชา").
  useEffect(() => {
    if (!focus) return;
    const el = boardRef.current?.querySelector<HTMLElement>(`[data-course="${focus}"]`);
    const sc = scrollRef.current;
    if (el && sc) sc.scrollTo({ left: Math.max(0, el.offsetLeft - sc.clientWidth / 2 + el.offsetWidth / 2), behavior: "smooth" });
  }, [focus]);

  const scrollToCol = (i: number) => {
    const el = boardRef.current?.querySelector<HTMLElement>(`[data-col="${i}"]`);
    const sc = scrollRef.current;
    if (el && sc) sc.scrollTo({ left: el.offsetLeft - 8, behavior: "smooth" });
  };
  const step = (dir: 1 | -1) => scrollRef.current?.scrollBy({ left: dir * (COL_W + COL_GAP), behavior: "smooth" });

  const card = (code: string, offPlan: boolean, idx: number) => {
    const c = findCourse(code);
    const s = status(code);
    const g = grade(code);
    const outcome = gradeOutcome(g);
    const Icon = outcome ? OUTCOME_ICON[outcome] : STATUS_ICON[s];
    const bottleneck = unlocks(code, PREREQS).length >= 2;
    const dim = dimmed(code);
    return (
      <button
        key={code}
        type="button"
        data-course={code}
        data-outcome={outcome ?? undefined}
        onClick={(e) => {
          // A quick jelly + sparkle burst, then open the sheet.
          const el = e.currentTarget;
          el.classList.remove("is-popping");
          void el.offsetWidth;
          el.classList.add("is-popping");
          window.setTimeout(() => onOpen(code), 220);
        }}
        onAnimationEnd={(e) => e.animationName === "jelly" && e.currentTarget.classList.remove("is-popping")}
        style={{ "--i": idx } as React.CSSProperties}
        className={cn(
          "graph-card stagger group relative flex w-full animate-pop-in flex-col rounded-md border p-3 text-left outline-none",
          "transition-[opacity,transform,box-shadow,background-color] duration-(--duration-base) ease-(--ease-bounce)",
          "hover:-translate-y-1 hover:-rotate-[0.6deg] hover:shadow-[0_12px_26px_-10px_var(--glow)] focus-visible:ring-3 focus-visible:ring-focus/30 active:scale-[0.97]",
          outcome ? OUTCOME_CARD[outcome] : offPlan ? `${OFF_PLAN} [--glow:var(--color-career)]` : cn(CARD[s], GLOW[s]),
          dim && "opacity-30 hover:opacity-80",
          highlight?.has(code) && "shadow-md ring-2 ring-secondary",
          "data-[rel=pre]:-translate-y-0.5 data-[rel=pre]:opacity-100 data-[rel=pre]:shadow-[0_0_0_2px_var(--color-edge-in),0_10px_22px_-10px_var(--color-edge-in)]",
          "data-[rel=next]:-translate-y-0.5 data-[rel=next]:opacity-100 data-[rel=next]:shadow-[0_0_0_2px_var(--color-edge-out),0_10px_22px_-10px_var(--color-edge-out)]",
        )}
      >
        <span className="graph-burst" aria-hidden />
        <span className="flex items-center justify-between gap-2 type-caption text-text-secondary">
          <span className="truncate">
            {code} · {tc("credits", { count: c?.credits ?? 3 })}
          </span>
          {bottleneck && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-secondary-soft px-1.5 type-badge whitespace-nowrap text-secondary-strong">
              <Lock className="size-3" aria-hidden />
              {tl("bottleneckShort")}
            </span>
          )}
        </span>
        <span className="mt-1 line-clamp-2 type-small-medium text-text">{c?.nameEn ?? code}</span>
        {c && <span className="line-clamp-1 type-caption text-text-secondary">{c.nameTh}</span>}
        <span className="mt-2 flex items-end justify-between gap-2">
          <span className={cn("inline-flex items-center gap-1 type-badge", outcome ? OUTCOME_TEXT[outcome] : s === "waiting" || s === "blocked" ? "text-warning" : "text-text")}>
            <Icon className="size-3.5 group-hover:animate-wiggle" aria-hidden />
            {outcome ? tcourses(`outcome.${outcome}`) : s === "in-progress" ? tl("tagCurrent") : tl(`statusShort.${s}`)}
          </span>
          {g ? (
            <span data-grade className={cn("type-h3 leading-none", outcome ? OUTCOME_TEXT[outcome] : "text-text group-hover:animate-jelly")}>{g}</span>
          ) : s === "in-progress" ? (
            <span className="type-caption text-text-secondary">{t("waitGrade")}</span>
          ) : null}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="type-h3 text-text">{t("boardTitle", { credits: totalCredits })}</h2>
          <p className="type-small text-text-secondary">{t("boardHint")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => step(-1)}>
            {t("prevTerm")}
          </Button>
          <Button variant="soft" size="sm" onClick={() => scrollToCol(CURRENT_INDEX)}>
            {t("currentTerm")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => step(1)}>
            {t("nextTerm")}
          </Button>
        </div>
      </div>
      <div ref={scrollRef} className="-mx-1 overflow-x-auto px-1 pb-3">
        <div
          ref={boardRef}
          className="graph-board relative isolate flex items-stretch"
          style={{ gap: COL_GAP, width: "max-content" }}
          onPointerOver={(e) => setHot(e.currentTarget, (e.target as HTMLElement).closest<HTMLElement>("[data-course]")?.dataset.course ?? null)}
          onPointerLeave={(e) => setHot(e.currentTarget, null)}
          onFocus={(e) => setHot(e.currentTarget, (e.target as HTMLElement).closest<HTMLElement>("[data-course]")?.dataset.course ?? null)}
          onBlur={(e) => setHot(e.currentTarget, null)}
        >
          {/* Behind the columns (z-0 vs z-1): lines only show in the gutters between terms. */}
          <svg ref={svgRef} className="pointer-events-none absolute inset-0 z-0 overflow-visible" aria-hidden>
            <defs>
              {(
                [
                  ["arrow-done", "var(--color-primary)"],
                  ["arrow-todo", "var(--color-border-strong)"],
                  ["arrow-in", "var(--color-edge-in)"],
                  ["arrow-out", "var(--color-edge-out)"],
                ] as const
              ).map(([id, color]) => (
                <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto" markerUnits="strokeWidth">
                  <path d="M1,1 L9,5 L1,9" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              ))}
            </defs>
            <g />
          </svg>
          {columns.map((col) => {
            const current = col.i === CURRENT_INDEX;
            let idx = 0;
            return (
              <section
                key={col.i}
                data-col={col.i}
                aria-label={tl("termTitle", { year: col.year, sem: String(col.sem) })}
                className={cn(
                  // Opaque and above the SVG so lines are hidden inside the column.
                  "relative z-[1] flex shrink-0 flex-col gap-3 rounded-lg bg-surface-alt p-3",
                  current && "border-2 border-info",
                )}
                style={{ width: COL_W }}
              >
                <header className="flex items-start justify-between gap-2 px-1">
                  <div>
                    <p className="type-small-medium text-text">{tl("termTitle", { year: col.year, sem: String(col.sem) })}</p>
                    <p className="type-caption text-text-secondary">{t("columnCredits", { credits: col.credits })}</p>
                  </div>
                  {current && (
                    <Tag tone="blue" dot>
                      {tl("tagCurrent")}
                    </Tag>
                  )}
                  {col.i === CURRENT_INDEX + 1 && (
                    <Tag tone="matcha" dot>
                      {tl("tagNext")}
                    </Tag>
                  )}
                </header>
                {col.planned.map((c) => card(c, false, idx++))}
                {col.offPlan.length > 0 && (
                  <>
                    <p className="mt-2 px-1 type-eyebrow text-text-secondary">{t("offPlan")}</p>
                    {col.offPlan.map((c) => card(c, true, idx++))}
                  </>
                )}
                {col.slots.length > 0 && (
                  <>
                    <p className="mt-2 px-1 type-eyebrow text-text-secondary">{t("slots")}</p>
                    {col.slots.map((s) => (
                      <Link
                        key={s.id}
                        href={`/search?category=${s.category}`}
                        className="group/slot flex flex-col rounded-md border border-dashed border-border-strong bg-surface-alt p-3 outline-none transition-[transform,background-color,border-color,box-shadow] duration-(--duration-base) ease-(--ease-bounce) hover:-translate-y-1 hover:rotate-[0.6deg] hover:border-primary hover:bg-primary-soft hover:shadow-[0_12px_26px_-10px_var(--color-primary)] focus-visible:ring-3 focus-visible:ring-focus/30 active:scale-[0.97]"
                      >
                        <span className="type-caption text-text-secondary">
                          {tl("slot")} · {tc("credits", { count: 3 })}
                        </span>
                        <span className="type-small-medium text-text">{tl(s.labelKey)}</span>
                        <span className="type-caption text-text-secondary">{tl(`${s.labelKey}Sub`)}</span>
                        <span className="mt-1 inline-flex items-center gap-1 type-badge text-primary">
                          <Plus className="size-3.5 transition-transform duration-(--duration-base) ease-(--ease-bounce) group-hover/slot:rotate-90 group-hover/slot:scale-125" aria-hidden />
                          {t("slotPick")}
                        </span>
                      </Link>
                    ))}
                  </>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  i,
  Icon,
  tile,
  label,
  value,
  caption,
  codes,
  onClick,
}: {
  i: number;
  Icon: typeof Check;
  tile: string;
  label: string;
  value: string;
  caption: string;
  codes: string[];
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{ "--i": i } as React.CSSProperties}
      className={cn("pop-card stagger grid animate-rise-in content-start gap-y-1.5 rounded-lg border border-border bg-surface p-5 text-left md:row-span-4 md:grid-rows-subgrid outline-none focus-visible:ring-3 focus-visible:ring-focus/30 disabled:cursor-default", (["[--pop:var(--color-pop-matcha)]", "[--pop:var(--color-pop-mango)]", "[--pop:var(--color-pop-sky)]"] as const)[i])}
    >
      <span className="flex items-center gap-2 type-small text-text-secondary">
        <span data-tile className={cn("inline-flex size-7 items-center justify-center rounded-sm", tile)}>
          <Icon className="size-4" aria-hidden />
        </span>
        {label}
      </span>
      <span className="type-h3 text-text">{value}</span>
      <span className="type-small text-text-secondary">{caption}</span>
      <span className="flex flex-col gap-1">
        {codes.map((code) => (
          <span key={code} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 type-small">
            <span className="text-text tabular-nums">{code}</span>
            <span className="truncate text-text-secondary">{findCourse(code)?.nameEn ?? ""}</span>
          </span>
        ))}
      </span>
    </button>
  );
}
