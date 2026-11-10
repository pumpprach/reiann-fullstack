"use client";

import { useTranslations } from "next-intl";
import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toMinutes, type ClassSlot } from "@/core/schedule";
import type { CreditCategory } from "@/core/types";
import { findCourse } from "@/mocks/courses";

export const GRID_START = 8;
export const GRID_END = 20;
const HOURS = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);

/** Figma: Schedule Block (Kind = Required | Elective | General | Conflict | Busy). */
export function blockTone(category: CreditCategory | undefined, opts: { conflict?: boolean; busy?: boolean }) {
  if (opts.conflict) return "border-2 border-error bg-error-bg";
  if (opts.busy) return "border border-border-strong bg-surface-alt";
  if (category === "elective") return "border border-career bg-career-bg";
  if (category === "general" || category === "free") return "border border-warning bg-warning-bg";
  return "border border-primary bg-primary-soft";
}

export function WeekGrid({
  slots,
  conflicts,
  showNames = true,
  onSelect,
}: {
  slots: ClassSlot[];
  conflicts?: Set<string>;
  showNames?: boolean;
  onSelect?: (slot: ClassSlot) => void;
}) {
  const tc = useTranslations("common");
  const tv = useTranslations("viewer");
  const span = (GRID_END - GRID_START) * 60;
  // Taller rows when names show, so code, name and room fit on three lines.
  const rowH = showNames ? "h-[76px]" : "h-16";

  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)]">
      <div />
      <div className="relative mb-1 h-5">
        {HOURS.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2 type-caption text-text-muted"
            style={{ left: `${((h - GRID_START) / (GRID_END - GRID_START)) * 100}%` }}
          >
            {String(h).padStart(2, "0")}
          </span>
        ))}
      </div>
      {[0, 1, 2, 3, 4, 5, 6].map((day) => {
        const daySlots = slots.filter((s) => s.day === day);
        return (
          <div key={day} className="contents">
            <div className={cn("flex items-center type-small text-text-secondary", rowH)}>{tc(`day.${day}` as "day.0")}</div>
            <div className={cn("relative border-t border-border", rowH, day >= 5 && "bg-surface-alt", day === 6 && "border-b")}>
              {HOURS.map((h) => (
                <span
                  key={h}
                  className="absolute top-0 bottom-0 w-px bg-border"
                  style={{ left: `${((h - GRID_START) / (GRID_END - GRID_START)) * 100}%` }}
                  aria-hidden
                />
              ))}
              {daySlots.map((s) => {
                const course = findCourse(s.courseCode);
                const left = ((toMinutes(s.start) - GRID_START * 60) / span) * 100;
                const width = ((toMinutes(s.end) - toMinutes(s.start)) / span) * 100;
                const conflict = conflicts?.has(s.id);
                const label = showNames
                  ? `${s.courseCode} ${course?.nameEn ?? ""} · ${s.start}–${s.end}${s.room ? ` · ${s.room}` : ""}`
                  : `${tv("busy")} · ${s.start}–${s.end}`;
                const inner = (
                  <>
                    <span className="block truncate type-badge text-text">{showNames ? s.courseCode : tv("busy")}</span>
                    {showNames && <span className="block truncate type-caption text-text">{course?.nameEn}</span>}
                    {showNames && s.room && <span className="block truncate type-caption text-text-secondary">{s.room}</span>}
                  </>
                );
                const cls = cn(
                  "absolute top-1 bottom-1 overflow-hidden rounded-md px-2 py-1 text-left",
                  blockTone(course?.category, { conflict, busy: !showNames }),
                  onSelect && "cursor-pointer hover:shadow-md focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none",
                );
                const style = { left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)` };
                return (
                  <Tooltip key={s.id}>
                    <TooltipTrigger asChild>
                      {onSelect ? (
                        <button type="button" className={cls} style={style} onClick={() => onSelect(s)} aria-label={label}>
                          {inner}
                        </button>
                      ) : (
                        <div className={cls} style={style} aria-label={label} tabIndex={0}>
                          {inner}
                        </div>
                      )}
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Legend() {
  const t = useTranslations("schedule");
  return (
    <div className="flex items-center gap-4 type-caption text-text-secondary">
      {[
        { label: t("legendRequired"), cls: blockTone("required", {}) },
        { label: t("legendElective"), cls: blockTone("elective", {}) },
        { label: t("legendGeneral"), cls: blockTone("general", {}) },
      ].map((l) => (
        <span key={l.label} className="flex items-center gap-1.5">
          <span className={cn("size-3 rounded-sm", l.cls)} aria-hidden />
          {l.label}
        </span>
      ))}
    </div>
  );
}

/** Phone layout: one section per day with classes listed by time. */
export function DayList({
  slots,
  conflicts,
  showNames = true,
  onSelect,
}: {
  slots: ClassSlot[];
  conflicts?: Set<string>;
  showNames?: boolean;
  onSelect?: (slot: ClassSlot) => void;
}) {
  const tc = useTranslations("common");
  const tv = useTranslations("viewer");
  return (
    <div className="flex flex-col">
      {[0, 1, 2, 3, 4, 5, 6].map((day) => {
        const items = slots.filter((s) => s.day === day).sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
        return (
          <section key={day} className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0">
            <div className="flex items-center justify-between">
              <h3 className="type-body-medium text-text">{tc(`day.${day}` as "day.0")}</h3>
              <span className="type-small text-text-muted">{items.length ? tc("courses", { count: items.length }) : tv("freeDay")}</span>
            </div>
            {items.map((s) => {
              const c = findCourse(s.courseCode);
              const body = (
                <>
                  <span className="w-12 shrink-0 type-small-medium whitespace-pre-line text-text-secondary">{`${s.start}\n${s.end}`}</span>
                  <span className={cn("block min-w-0 flex-1 rounded-md px-2.5 py-1.5 text-left", blockTone(c?.category, { conflict: conflicts?.has(s.id), busy: !showNames }))}>
                    <span className="block truncate type-badge text-text">{showNames ? s.courseCode : tv("busy")}</span>
                    {showNames && <span className="block truncate type-caption text-text">{c?.nameEn}</span>}
                    {showNames && s.room && <span className="block truncate type-caption text-text-secondary">{s.room}</span>}
                  </span>
                </>
              );
              return onSelect ? (
                <button key={s.id} type="button" onClick={() => onSelect(s)} className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-focus/40">
                  {body}
                </button>
              ) : (
                <div key={s.id} className="flex items-center gap-3">
                  {body}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
