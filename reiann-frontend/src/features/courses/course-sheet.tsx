"use client";

import { useLocale, useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "cn";
import { unlocks } from "@/core/courses";
import { Tag } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { splitTerm } from "@/lib/format";
import { PLAN_TERM, PREREQS } from "@/mocks/course-info";
import { findCourse } from "@/mocks/courses";
import { StatusTag, useCourseStatus } from "./status";

/**
 * Figma: Graph Overlay / <code>. Side sheet opened from a graph card.
 * Driven by `?course=` so the browser back button closes it (frontend-flows §1).
 */
export function CourseSheet({
  code,
  onClose,
  highlighted,
  onHighlight,
}: {
  code: string | null;
  onClose: () => void;
  highlighted: boolean;
  onHighlight: (code: string | null) => void;
}) {
  const tc = useTranslations("common");
  const course = code ? findCourse(code) : undefined;
  return (
    <DialogPrimitive.Root open={!!course} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(480px,100vw)] flex-col bg-surface shadow-lg outline-none data-open:animate-in data-open:slide-in-from-right data-open:duration-300 data-closed:animate-out data-closed:slide-out-to-right">
          {course && code && (
            <SheetBody code={code} highlighted={highlighted} onHighlight={onHighlight} closeLabel={tc("close")} />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SheetBody({
  code,
  highlighted,
  onHighlight,
  closeLabel,
}: {
  code: string;
  highlighted: boolean;
  onHighlight: (code: string | null) => void;
  closeLabel: string;
}) {
  const t = useTranslations("courses");
  const ts = useTranslations("courses.sheet");
  const tc = useTranslations("common");
  const locale = useLocale();
  const st = useCourseStatus();
  const course = findCourse(code)!;
  const status = st.status(code);
  const missing = st.missing(code);
  const prereqs = PREREQS[code];
  const next = unlocks(code, PREREQS);
  const plan = PLAN_TERM[code];
  const record = st.record(code);
  const term = record ? (() => {
    const { year, sem } = splitTerm(record.term);
    return tc("term", { sem, year });
  })() : "";

  const row = (c: string, tag: React.ReactNode, i: number) => {
    const info = findCourse(c);
    return (
      <Link
        key={c}
        href={`/courses/graph?course=${c}`}
        replace
        style={{ "--i": i } as React.CSSProperties}
        className="stagger flex animate-rise-in items-center gap-3 rounded-md bg-surface-alt px-3 py-2.5 transition-colors outline-none hover:bg-surface-hover focus-visible:ring-3 focus-visible:ring-focus/30"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate type-small-medium text-text">{info?.nameEn ?? c}</span>
          <span className="block type-caption text-text-secondary">{c}</span>
        </span>
        {tag}
      </Link>
    );
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <p className="type-small text-text-secondary">
            {code} · {tc("credits", { count: course.credits })}
          </p>
          <DialogPrimitive.Close asChild>
            <Button variant="outline" size="sm">
              {closeLabel}
            </Button>
          </DialogPrimitive.Close>
        </div>
        <DialogPrimitive.Title className="mt-2 type-h2 text-text">{course.nameEn}</DialogPrimitive.Title>
        <DialogPrimitive.Description className={cn("type-body text-text-secondary", locale !== "th" && "sr-only")}>
          {locale === "th" ? course.nameTh : course.nameEn}
        </DialogPrimitive.Description>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusTag status={status} missing={missing} />
          {next.length >= 2 && (
            <Tag tone="strawberry" dot>
              {t("detail.bottleneck")}
            </Tag>
          )}
        </div>

        <div className="mt-5 animate-pop-in rounded-md bg-surface-alt px-4 py-3">
          <p className="type-small-medium text-text">{t(`statusBox.${status}`, { grade: record?.grade ?? "" })}</p>
          <p className="type-caption text-text-secondary">
            {t(`statusBox.${status}Sub`, { term, codes: missing.join(", ") })}
          </p>
        </div>

        <p className="mt-5 type-small text-text-secondary">{ts("planTerm")}</p>
        <p className="type-label text-text">{plan ? t("termName", { year: plan[0], sem: String(plan[1]) }) : ts("notInPlan")}</p>

        <p className="mt-5 mb-2 type-small text-text-secondary">{ts("mustPass")}</p>
        <div className="flex flex-col gap-2">
          {prereqs === undefined ? (
            <p className="rounded-md border border-dashed border-border-strong px-3 py-2.5 type-small text-text-secondary">{ts("noPrereqData")}</p>
          ) : prereqs.length === 0 ? (
            <p className="rounded-md bg-surface-alt px-3 py-2.5 type-small text-text-secondary">{ts("noPrereq")}</p>
          ) : (
            prereqs.map((p, i) => {
              const s = st.status(p);
              const g = st.record(p)?.grade;
              return row(
                p,
                s === "passed" ? (
                  <Tag tone="matcha" dot>
                    {ts("passedGrade", { grade: g ?? "" })}
                  </Tag>
                ) : (
                  <StatusTag status={s} missing={st.missing(p)} />
                ),
                i,
              );
            })
          )}
        </div>

        <p className="mt-5 mb-2 type-small text-text-secondary">{ts("next")}</p>
        <div className="flex flex-col gap-2">
          {next.length === 0 ? (
            <p className="rounded-md bg-surface-alt px-3 py-2.5 type-small text-text-secondary">{ts("noNext")}</p>
          ) : (
            next.map((n, i) =>
              row(
                n,
                st.status(n) === "passed" ? (
                  <Tag tone="matcha" dot>
                    {t("status.passed")}
                  </Tag>
                ) : (
                  <Tag tone="amber" dot>
                    {ts("needs", { code })}
                  </Tag>
                ),
                i + 1,
              ),
            )
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-border px-6 py-4">
        <Button variant="outline" onClick={() => onHighlight(highlighted ? null : code)}>
          {highlighted ? ts("clearHighlight") : ts("highlight")}
        </Button>
        <Button asChild>
          <Link href={`/course/${code}`}>{ts("open")}</Link>
        </Button>
      </div>
    </>
  );
}
