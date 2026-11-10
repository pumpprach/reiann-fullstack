"use client";

import { Check, FileText, GripVertical, Info, ListChecks, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { PageHeader } from "@/components/app/shell";
import { Banner, Card, Chip, ProgressBar, Tag, TextField } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import {
  BASIC_SCORE_PLAN,
  DEFAULT_CUTOFFS,
  requiredForGrade,
  scoreIssue,
  summarizeScores,
  suOutcome,
  bestReachableGrade,
  moveItem,
  type ScoreCategory,
} from "@/core/calculator";
import { formatGpa, projectGpax } from "@/core/grades";
import type { Course, LetterGrade } from "@/core/types";
import type { CalculatorState } from "@/data/repository";
import { useSaveCalculator } from "@/data/hooks";
import { useStudent } from "@/features/student";
import { celebrate } from "@/lib/confetti";
import { ChooseCourseDialog } from "./choose-course";

const TARGETS: LetterGrade[] = ["A", "B+", "B", "C+", "C"];
const TABLE: LetterGrade[] = ["D", "D+", "C", "C+", "B", "B+", "A"];
/** KU second-class honours line. */
const HONORS_GPAX = 3.25;
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
const fmtPts = (n: number) => String(Math.round(n * 10) / 10);
// Phone: two lines per category (name on top, numbers below). md+: one row.
const ROW_COLS =
  "grid grid-cols-[28px_88px_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 md:grid-cols-[28px_minmax(0,1fr)_88px_172px_64px_36px] md:gap-x-3 md:gap-y-0";
const AT = {
  handle: "max-md:col-start-1 max-md:row-start-1",
  name: "max-md:col-span-2 max-md:col-start-2 max-md:row-start-1",
  remove: "max-md:col-start-4 max-md:row-start-1 max-md:justify-self-end",
  weight: "max-md:col-start-2 max-md:row-start-2",
  score: "max-md:col-start-3 max-md:row-start-2",
  worth: "max-md:col-start-4 max-md:row-start-2",
};

/** Counts from the previous value to the new one. */
function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const el = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  useLayoutEffect(() => {
    const node = el.current;
    const from = shown.current;
    if (!node || from === value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shown.current = value;
      node.textContent = format(value);
      return;
    }
    node.textContent = format(from);
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const p = Math.min(1, (now - start) / 450);
      shown.current = from + (value - from) * (1 - (1 - p) ** 3);
      node.textContent = format(p === 1 ? value : shown.current);
      if (p < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, format]);
  return <span ref={el}>{format(value)}</span>;
}

const fmtPct = (n: number) => `${Math.round(n)}%`;
const fmtGpaNumber = (n: number) => formatGpa(n);
const needPoints = (fraction: number, max: number) => Math.ceil(fraction * max * 10 - 1e-9) / 10;

function NumberInput({
  value,
  onChange,
  invalid,
  label,
  className,
  allowEmpty,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  invalid?: boolean;
  label: string;
  className?: string;
  allowEmpty?: boolean;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  const [prev, setPrev] = useState(value);
  if (!Object.is(prev, value)) {
    // Value changed from outside (e.g. reset): show it unless the text already means it.
    setPrev(value);
    const same = value === null ? text.trim() === "" : Number(text) === value;
    if (!same && !Number.isNaN(value)) setText(value === null ? "" : String(value));
  }
  return (
    <TextField
      inputMode="decimal"
      aria-label={label}
      value={text}
      placeholder={allowEmpty ? "–" : undefined}
      invalid={invalid}
      className={cn("h-10 px-2 text-center", className)}
      onChange={(e) => {
        const raw = e.target.value.trim();
        setText(e.target.value);
        if (raw === "" && allowEmpty) onChange(null);
        else onChange(raw === "" ? Number.NaN : Number(raw));
      }}
    />
  );
}

export function CalculatorView({ course, initial }: { course: Course; initial: CalculatorState }) {
  const t = useTranslations("calculator");
  const tc = useTranslations("common");
  const locale = useLocale();
  const student = useStudent();
  const save = useSaveCalculator();
  const [state, setState] = useState(initial);
  const [editingCutoffs, setEditingCutoffs] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const first = useRef(true);

  // Autosave 1 s after the user stops typing (no save button, §4.3).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => save.mutate(state), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const cats = state.categories;
  const s = summarizeScores(cats);
  const result = requiredForGrade(cats, state.target, state.cutoffs);
  const pending = cats.filter((c) => c.score === null || scoreIssue(c) !== null);
  const singlePending = pending.length === 1 ? pending[0] : null;
  const best = bestReachableGrade(cats, state.cutoffs);
  const isSU = course.gradingMode === "su";

  // Reordering: drag the grip with mouse/touch, or focus it and press ArrowUp/ArrowDown.
  const [dragId, setDragId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const moveCat = (id: string, to: number) => {
    const from = state.categories.findIndex((c) => c.id === id);
    if (from < 0 || from === to || to < 0 || to >= state.categories.length) return;
    const moved = state.categories[from];
    setState((st) => ({ ...st, categories: moveItem(st.categories, st.categories.findIndex((c) => c.id === id), to) }));
    setAnnounce(t("reorderMoved", { name: moved.name || to + 1, pos: to + 1, total: state.categories.length }));
  };
  const dragOver = (clientY: number) => {
    if (!dragId) return;
    // Target index = number of other rows whose vertical midpoint is above the pointer.
    let to = 0;
    for (const c of cats) {
      if (c.id === dragId) continue;
      const el = rowRefs.current.get(c.id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientY > r.top + r.height / 2) to++;
    }
    moveCat(dragId, to);
  };

  const setCat = (id: string, patch: Partial<ScoreCategory>) =>
    setState((st) => ({ ...st, categories: st.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  const applyBasicPlan = () => {
    const before = state.categories;
    const categories = BASIC_SCORE_PLAN.map((c) => ({ ...c, id: crypto.randomUUID(), max: c.weight, score: null }));
    setState((st) => ({ ...st, categories }));
    toast(t("presetApplied"), {
      action: { label: t("undo"), onClick: () => setState((st) => ({ ...st, categories: before })) },
    });
  };

  const issueText = (c: ScoreCategory) => {
    const i = scoreIssue(c);
    return i === "over-max" ? t("errOverMax") : i === "negative" ? t("errNegative") : i === "not-number" ? t("errNumber") : i === "bad-max" ? t("errMax") : null;
  };

  /** Raw final-exam points needed for a grade (single pending category). */
  const finalPointsFor = (grade: LetterGrade) => {
    const r = requiredForGrade(cats, grade, state.cutoffs);
    if (r.status === "guaranteed") return { kind: "done" as const };
    if (r.status === "impossible") return { kind: "no" as const };
    if (r.status !== "needed") return null;
    const pts = singlePending ? r.fraction * singlePending.max : r.fraction * 100;
    return { kind: "need" as const, pts: Math.ceil(pts * 10 - 1e-9) / 10 };
  };

  const gpaxBase = student.summary;
  const projected = useMemo(
    () => (gpaxBase.gpa === null ? null : projectGpax(gpaxBase, state.target, course.credits)),
    [gpaxBase, state.target, course.credits],
  );

  // Confetti when the student's numbers reach something good: the target grade is
  // locked in, or this result would lift GPAX over the honours line. Each one
  // fires once per visit, and never for what was already true on arrival.
  const reachedHonors =
    !isSU && s.weightsComplete && result.status !== "impossible" && gpaxBase.gpa !== null && gpaxBase.gpa < HONORS_GPAX && projected !== null && projected >= HONORS_GPAX;
  const reachedTarget = !isSU && (result.status === "guaranteed" || (result.status === "nothing-pending" && result.achieved));
  const achievement = reachedTarget ? `grade-${state.target}` : reachedHonors ? "honors" : null;
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(achievement ? [achievement] : []);
      return;
    }
    if (achievement && !seen.current.has(achievement)) {
      seen.current.add(achievement);
      celebrate();
    }
  }, [achievement]);

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow", { code: course.code, credits: course.credits })}
        title={course.nameEn}
        subtitle={
          <>
            {locale === "th" && <p>{course.nameTh}</p>}
            <p>{t("intro")}</p>
          </>
        }
        actions={
          <Button variant="outline" onClick={() => setChoosing(true)}>
            {t("changeCourse")}
          </Button>
        }
      />
      <ChooseCourseDialog open={choosing} onOpenChange={setChoosing} />

      {save.isError && (
        <Banner
          tone="error"
          title={t("saveFailed")}
          className="mb-4"
          action={
            <Button size="sm" variant="outline" onClick={() => save.mutate(state)}>
              {t("retryNow")}
            </Button>
          }
        >
          {t("saveFailedBody")}
        </Banner>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <h2 className="type-h3 text-text">{t("categoriesTitle")}</h2>
              <p className="flex items-center gap-1.5 type-caption text-text-secondary">
                <FileText className="size-4" aria-hidden />
                {t("categoriesHint")}
              </p>
            </div>
            <div className={cn(ROW_COLS, "mt-3 hidden md:grid")}>
              <span />
              <span className="type-caption text-text-secondary">{t("colName")}</span>
              <span className="type-caption text-text-secondary">{t("colWeight")}</span>
              <span className="type-caption text-text-secondary">{t("colScore")}</span>
              <span className="text-right type-caption text-text-secondary">{t("colWorth")}</span>
              <span />
            </div>
            <div role="list" aria-label={t("categoriesTitle")} className="mt-2 flex flex-col gap-2">
              {cats.map((c, idx) => {
                const issue = issueText(c);
                const dragging = dragId === c.id;
                return (
                  <div
                    key={c.id}
                    role="listitem"
                    ref={(el) => {
                      if (el) rowRefs.current.set(c.id, el);
                      else rowRefs.current.delete(c.id);
                    }}
                    className={cn(
                      "rounded-md transition-shadow max-md:border-b max-md:border-border max-md:pb-3 max-md:last:border-b-0",
                      dragging && "relative z-10 bg-surface shadow-lg ring-2 ring-border-focus",
                    )}
                  >
                    <div className={ROW_COLS}>
                      <button
                        type="button"
                        aria-label={t("reorderHandle", { name: c.name || idx + 1 })}
                        className={cn(
                          AT.handle,
                          "flex h-10 w-7 touch-none items-center justify-center rounded-sm text-text-secondary hover:bg-surface-hover hover:text-text focus-visible:outline-2 focus-visible:outline-border-focus",
                          dragging ? "cursor-grabbing" : "cursor-grab",
                        )}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setDragId(c.id);
                        }}
                        onPointerMove={(e) => dragging && dragOver(e.clientY)}
                        onPointerUp={() => setDragId(null)}
                        onPointerCancel={() => setDragId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                            e.preventDefault();
                            moveCat(c.id, idx + (e.key === "ArrowUp" ? -1 : 1));
                          } else if (e.key === "Home" || e.key === "End") {
                            e.preventDefault();
                            moveCat(c.id, e.key === "Home" ? 0 : cats.length - 1);
                          }
                        }}
                      >
                        <GripVertical className="size-4" aria-hidden />
                      </button>
                      <TextField
                        aria-label={`${t("colName")} ${idx + 1}`}
                        value={c.name}
                        placeholder={t("newCategory")}
                        onChange={(e) => setCat(c.id, { name: e.target.value })}
                        className={cn("h-10", AT.name)}
                      />
                      <span className={cn("flex items-center gap-1", AT.weight)}>
                        <NumberInput label={`${t("colWeight")} ${c.name}`} value={c.weight} onChange={(v) => setCat(c.id, { weight: v ?? 0 })} />
                        <span className="type-caption text-text-secondary">%</span>
                      </span>
                      <span className={cn("flex items-center gap-1.5", AT.score)}>
                        <NumberInput
                          label={`${t("colScore")} ${c.name}`}
                          value={c.score}
                          allowEmpty
                          invalid={!!issue && scoreIssue(c) !== "bad-max"}
                          className={cn(c.score === null && "bg-secondary-soft")}
                          onChange={(v) => setCat(c.id, { score: v })}
                        />
                        <span className="text-text-secondary">/</span>
                        <NumberInput label={`max ${c.name}`} value={c.max} invalid={scoreIssue(c) === "bad-max"} onChange={(v) => setCat(c.id, { max: v ?? 0 })} />
                      </span>
                      <span className={cn("text-right type-small-medium text-text", AT.worth)}>
                        {c.score === null ? <span className="type-small text-text-secondary">{t("pendingExam")}</span> : issue ? "–" : fmt1((c.score / c.max) * c.weight)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className={AT.remove}
                        aria-label={t("removeCategory", { name: c.name || idx + 1 })}
                        onClick={() => setState((st) => ({ ...st, categories: st.categories.filter((x) => x.id !== c.id) }))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    {issue && <p className="mt-1 pl-9 type-caption text-error md:pl-10">{issue}</p>}
                  </div>
                );
              })}
            </div>
            <p aria-live="polite" className="sr-only">
              {announce}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setState((st) => ({
                      ...st,
                      categories: [...st.categories, { id: crypto.randomUUID(), name: "", weight: 10, score: null, max: 10 }],
                    }))
                  }
                >
                  <Plus /> {t("addCategory")}
                </Button>
                <Button variant="soft" onClick={applyBasicPlan}>
                  <ListChecks /> {t("usePreset")}
                </Button>
              </div>
              <Tag tone={s.weightsComplete ? "matcha" : "amber"} dot>
                {s.weightsComplete ? t("weightOk") : t("weightBad", { total: fmtPts(s.weightTotal) })}
              </Tag>
            </div>
            <div className="mt-5 flex justify-between type-small">
              <span className="text-text-secondary">{t("collected")}</span>
              <span className="type-small-medium text-text">
                {fmtPts(s.collected)} / {fmtPts(s.knownWeight)}
              </span>
            </div>
            <ProgressBar className="mt-2" value={s.knownWeight ? (s.collected / s.knownWeight) * 100 : 0} label={t("collected")} />
          </Card>

          <Card>
            <h2 className="type-h3 text-text">{t("tableTitle")}</h2>
            <p className="mt-1 type-small text-text-secondary">
              {s.weightsComplete && best ? t("tableBody", { max: fmtPts(s.maxPossible), grade: best }) : t("tableBodyWaiting")}
            </p>
            {s.weightsComplete && !isSU && (
              <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {TABLE.map((g) => {
                  const r = finalPointsFor(g);
                  const selected = g === state.target;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => TARGETS.includes(g) && setState((st) => ({ ...st, target: g }))}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-md border px-2 py-3",
                        selected ? "border-secondary-strong bg-secondary-soft" : "border-transparent bg-surface-alt",
                        r?.kind === "no" && "opacity-60",
                      )}
                    >
                      <span className="type-h3 text-text">{g}</span>
                      <span className="type-caption text-text-secondary">
                        {r?.kind === "done" ? t("already") : r?.kind === "no" ? t("impossible") : r ? t("atLeast", { points: fmtPts(r.pts) }) : "–"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start xl:flex xl:flex-col xl:items-stretch">
          {isSU ? (
            <Card>
              <h2 className="type-h3 text-text">{t("suTitle")}</h2>
              {(() => {
                const o = suOutcome(cats);
                return (
                  <Banner tone={o === "passed" ? "success" : o === "failed" ? "error" : "info"} className="mt-3">
                    {o === "passed" ? t("suPassed") : o === "failed" ? t("suFailed") : t("suOpen")}
                  </Banner>
                );
              })()}
              <p className="mt-3 type-caption text-text-secondary">{t("suNote")}</p>
            </Card>
          ) : (
            <Card className="pop-card [--pop:var(--color-pop-pink)]">
              <h2 className="type-h3 text-text">{t("targetTitle")}</h2>
              <div className="mt-3 flex gap-2" role="radiogroup" aria-label={t("targetTitle")}>
                {TARGETS.map((g) => (
                  <button
                    key={g}
                    role="radio"
                    aria-checked={g === state.target}
                    onClick={() => setState((st) => ({ ...st, target: g }))}
                    className={cn(
                      "press h-11 flex-1 rounded-md border type-label outline-none focus-visible:shadow-[0_0_0_2px_var(--color-surface),0_0_0_4px_var(--color-secondary-strong)]",
                      g === state.target
                        ? "animate-jelly border-secondary-strong bg-secondary text-on-secondary"
                        : "border-border-strong bg-surface text-text hover:-translate-y-0.5 hover:border-secondary-strong hover:bg-secondary-soft",
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <TargetPanel key={result.status} result={result} grade={state.target} cutoff={state.cutoffs[state.target]} singleMax={singlePending?.max ?? null} total={s.collected} />
            </Card>
          )}

          {!isSU && (
            <Card className="pop-card [--pop:var(--color-pop-matcha)]">
              <h2 className="type-h3 text-text">{t("gpaxTitle")}</h2>
              <p className="mt-2 flex flex-wrap items-center gap-3 type-stat text-text">
                <span className="text-text-secondary">{formatGpa(gpaxBase.gpa)}</span>
                <span aria-hidden className="gpax-arrow type-h3 text-text-secondary">→</span>
                {s.weightsComplete && projected !== null && gpaxBase.gpa !== null ? (
                  <>
                    <AnimatedNumber value={projected} format={fmtGpaNumber} />
                    {(() => {
                      const delta = Number(formatGpa(projected)) - Number(formatGpa(gpaxBase.gpa));
                      if (delta === 0) return null;
                      return (
                        <span
                          key={projected}
                          className={cn("animate-pop-in rounded-full px-2 py-0.5 type-badge", delta > 0 ? "bg-success-bg text-primary-active" : "bg-error-bg text-danger")}
                        >
                          {delta > 0 ? "+" : "−"}
                          {Math.abs(delta).toFixed(2)}
                        </span>
                      );
                    })()}
                  </>
                ) : (
                  <span>–</span>
                )}
              </p>
              <p className="mt-2 type-small text-text-secondary">
                {gpaxBase.gpa === null
                  ? t("gpaxNoBase")
                  : !s.weightsComplete
                    ? t("gpaxWaiting")
                    : t("gpaxBody", { grade: state.target, credits: course.credits, value: formatGpa(projected), base: gpaxBase.gpaCredits })}
              </p>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="type-h3 text-text">{t("cutoffTitle")}</h2>
              {!isSU && (
                <Button variant="ghost" size="sm" onClick={() => setEditingCutoffs((e) => !e)}>
                  {editingCutoffs ? t("cutoffDone") : t("cutoffEdit")}
                </Button>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Chip selected={state.cutoffMode === "fixed"} onClick={() => setState((st) => ({ ...st, cutoffMode: "fixed" }))}>
                {state.cutoffMode === "fixed" && <Check className="size-4" aria-hidden />}
                {t("cutoffFixed")}
              </Chip>
              <Chip selected={state.cutoffMode === "curve"} onClick={() => setState((st) => ({ ...st, cutoffMode: "curve" }))}>
                {state.cutoffMode === "curve" && <Check className="size-4" aria-hidden />}
                {t("cutoffCurve")}
              </Chip>
            </div>
            {editingCutoffs && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {(["A", "B+", "B", "C+", "C", "D+", "D"] as LetterGrade[]).map((g) => (
                  <label key={g} className="flex flex-col gap-1 type-caption text-text-secondary">
                    {g}
                    <NumberInput
                      label={`${t("cutoffTitle")} ${g}`}
                      value={state.cutoffs[g]}
                      onChange={(v) => setState((st) => ({ ...st, cutoffs: { ...st.cutoffs, [g]: v ?? 0 } }))}
                    />
                  </label>
                ))}
                <Button variant="ghost" size="sm" className="self-end" onClick={() => setState((st) => ({ ...st, cutoffs: DEFAULT_CUTOFFS }))}>
                  <RotateCcw /> {t("cutoffReset")}
                </Button>
              </div>
            )}
            <Banner tone="info" className="mt-3">
              {t("cutoffNote")}
            </Banner>
          </Card>
        </div>
      </div>

      <p className="mt-6 flex flex-wrap items-center gap-2 type-caption text-text-secondary">
        <Info className="size-4" aria-hidden />
        {t("footnote")}
        <span className="ml-auto">{save.isPending ? tc("saving") : save.isSuccess ? tc("saved") : null}</span>
      </p>
    </>
  );
}

function TargetPanel({
  result,
  grade,
  cutoff,
  singleMax,
  total,
}: {
  result: ReturnType<typeof requiredForGrade>;
  grade: LetterGrade;
  cutoff: number;
  singleMax: number | null;
  total: number;
}) {
  const t = useTranslations("calculator");
  const box = "mt-3 animate-pop-in rounded-md p-4 origin-top";
  if (result.status === "incomplete-weights") {
    return (
      <div className={cn(box, "bg-warning-bg")}>
        <p className="type-small-medium text-text">{t("cantYet")}</p>
        <p className="type-stat text-text">–</p>
        <p className="type-small text-text-secondary">{t("fixWeights")}</p>
      </div>
    );
  }
  if (result.status === "guaranteed") {
    return (
      <div className={cn(box, "bg-success-bg")}>
        <p className="type-h3 text-text">{t("guaranteed", { grade })}</p>
        <p className="type-small text-text-secondary">{t("guaranteedBody")}</p>
      </div>
    );
  }
  if (result.status === "impossible") {
    return (
      <div className={cn(box, "bg-error-bg")}>
        <p className="type-h3 text-text">{t("impossibleTitle", { grade })}</p>
        <p className="type-small text-text-secondary">
          {t("impossibleBody", { max: fmtPts(result.maxPossible), grade, cutoff })}
        </p>
      </div>
    );
  }
  if (result.status === "nothing-pending") {
    return (
      <div className={cn(box, "bg-surface-alt")}>
        <p className="type-h3 text-text">{t("finished")}</p>
        <p className="type-small text-text-secondary">{t("finishedBody", { total: fmtPts(total), grade: result.achieved ? grade : "–" })}</p>
      </div>
    );
  }
  const pct = Math.round(result.fraction * 100);
  return (
    <div className={cn(box, "bg-secondary")}>
      <p className="type-small-medium text-on-secondary">{t("needLabel")}</p>
      {singleMax !== null ? (
        <p className="text-on-secondary">
          <span className="text-[48px] leading-[60px] font-bold">
            <AnimatedNumber value={needPoints(result.fraction, singleMax)} format={fmtPts} />
          </span>{" "}
          <span className="type-body">{t("needOutOf", { max: singleMax })}</span>
        </p>
      ) : (
        <p className="text-[48px] leading-[60px] font-bold text-on-secondary">
          <AnimatedNumber value={pct} format={fmtPct} />
        </p>
      )}
      <p className="type-small text-on-secondary">{singleMax !== null ? t("needPct", { pct }) : t("needPctMulti", { pct })}</p>
    </div>
  );
}
