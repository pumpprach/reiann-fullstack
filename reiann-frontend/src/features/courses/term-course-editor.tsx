"use client";

import { Pencil, Search, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Popover } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import type { Grade, TermId } from "@/core/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSaveRecords } from "@/data/hooks";
import { useStudent } from "@/features/student";
import { burst } from "@/lib/confetti";
import { CATALOG, findCourse } from "@/mocks/courses";

const LETTER_GRADES: Grade[] = ["A", "B+", "B", "C+", "C", "D+", "D", "F", "W"];
const SU_GRADES: Grade[] = ["S", "U", "W"];

/** Open delay: long enough that running the pointer down the list opens nothing. */
const OPEN_DELAY = 300;
const SWITCH_DELAY = 70;
const CLOSE_DELAY = 180;

/** The one card showing right now, so that hovering another row replaces it. */
let active: { setOpen: (open: boolean) => void; pinned: { current: boolean } } | null = null;

/**
 * A course row of a registered term. Hovering it brings up a small editing card
 * to the right, over the credits panel; the row's edit button opens the same
 * card and keeps it open (for keyboard and touch).
 */
export function TermCourseRow({
  term,
  code,
  className,
  style,
  children,
}: {
  term: TermId;
  code: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const t = useTranslations("courses.list");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { records } = useStudent();
  const save = useSaveRecords();
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(true);
  const pinned = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const row = useRef<HTMLLIElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (active?.setOpen === setOpen) active = null;
    },
    [],
  );

  const show = (pin: boolean) => {
    clearTimeout(timer.current);
    if (active && active.setOpen !== setOpen) active.setOpen(false);
    active = { setOpen, pinned };
    pinned.current = pin;
    // Beside the row when the credits panel is there, otherwise under it.
    setWide(window.matchMedia("(min-width: 1024px)").matches);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(timer.current);
    if (active?.setOpen === setOpen) active = null;
    setOpen(false);
  };

  const hoverIn = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(timer.current);
    if (open || (active?.pinned.current && active.setOpen !== setOpen)) return;
    timer.current = setTimeout(() => show(false), active ? SWITCH_DELAY : OPEN_DELAY);
  };
  const hoverOut = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(timer.current);
    if (open && !pinned.current) timer.current = setTimeout(hide, CLOSE_DELAY);
  };

  const course = findCourse(code);
  const record = records.find((r) => r.term === term && r.code === code);
  const options = course?.gradingMode === "su" ? SU_GRADES : LETTER_GRADES;

  const setGrade = (grade: Grade | null) => save.mutate(records.map((r) => (r.term === term && r.code === code ? { ...r, grade } : r)));
  const remove = () => {
    const before = records;
    hide();
    save.mutate(records.filter((r) => !(r.term === term && r.code === code)));
    toast(t("removedFromTerm", { code }), { action: { label: t("undo"), onClick: () => save.mutate(before) } });
  };

  const choice = (value: Grade | null, label: string) => (
    <button
      key={label}
      type="button"
      aria-pressed={record?.grade === value}
      onClick={() => setGrade(value)}
      className={cn(
        "press h-8 rounded-sm border type-small-medium outline-none focus-visible:ring-3 focus-visible:ring-focus/40",
        record?.grade === value ? "animate-jelly border-primary bg-primary text-on-primary" : "border-border bg-surface text-text hover:border-primary hover:bg-primary-soft",
      )}
    >
      {label}
    </button>
  );

  return (
    <Popover.Root open={open} onOpenChange={(o) => !o && hide()}>
      <Popover.Anchor asChild>
        <li
          ref={row}
          style={style}
          data-open={open || undefined}
          className={cn("term-row relative", className)}
          onPointerEnter={hoverIn}
          onPointerLeave={hoverOut}
        >
          {children}
          <Button
            ref={editButton}
            variant="outline"
            size="sm"
            aria-label={t("editCourseLabel", { code })}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="term-edit right-3 h-8 gap-1 px-2 max-md:w-8 md:right-5"
            onClick={() => (open && pinned.current ? hide() : show(true))}
          >
            <Pencil className="size-3.5" aria-hidden />
            <span className="max-md:sr-only">{t("editCourse")}</span>
          </Button>
        </li>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          side={wide ? "right" : "bottom"}
          align={wide ? "center" : "end"}
          // Lands exactly on the 330px credits panel, one 24px grid gap away.
          sideOffset={wide ? 25 : 4}
          collisionPadding={12}
          aria-label={t("editCourseLabel", { code })}
          onPointerEnter={() => clearTimeout(timer.current)}
          onPointerLeave={hoverOut}
          onOpenAutoFocus={(e) => !pinned.current && e.preventDefault()}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (pinned.current) editButton.current?.focus();
          }}
          onInteractOutside={(e) => row.current?.contains(e.target as Node) && e.preventDefault()}
          className="z-50 flex w-[min(330px,calc(100vw-24px))] origin-(--radix-popover-content-transform-origin) animate-pop-in flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-lg outline-none"
        >
          <div className="min-w-0">
            <p className="type-caption text-text-secondary">
              {code} · {tc("credits", { count: record?.credits ?? course?.credits ?? 3 })}
            </p>
            <p className="truncate type-small-medium text-text">{course?.nameEn ?? code}</p>
            {locale === "th" && course && <p className="truncate type-caption text-text-secondary">{course.nameTh}</p>}
          </div>
          <div role="group" aria-label={t("editGrade")}>
            <p className="mb-1.5 type-caption text-text-secondary">{t("editGrade")}</p>
            <div className="grid grid-cols-5 gap-1.5">
              {choice(null, t("gradePending"))}
              {options.map((g) => choice(g, g))}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="self-start text-danger hover:text-danger" onClick={remove}>
            <Trash2 /> {t("removeFromTerm")}
          </Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Adds a course the student registered but that is missing from a term. */
export function AddTermCourseDialog({
  term,
  open,
  onOpenChange,
}: {
  term: TermId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("courses.list");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { records } = useStudent();
  const save = useSaveRecords();
  const [q, setQ] = useState("");

  const inTerm = new Set(records.filter((r) => r.term === term).map((r) => r.code));
  const needle = q.trim().toLowerCase();
  const results = CATALOG.filter((c) => !inTerm.has(c.code) && `${c.code} ${c.nameEn} ${c.nameTh}`.toLowerCase().includes(needle));
  const [year, sem] = term.split("/");

  const add = (code: string, credits: number) => {
    save.mutate([...records, { code, term, credits, grade: null }]);
    burst();
    toast.success(t("addedToTerm", { code }));
    onOpenChange(false);
    setQ("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("addToTerm")}</DialogTitle>
          <DialogDescription>{t("addToTermBody", { term: tc("term", { sem, year }) })}</DialogDescription>
        </DialogHeader>
        <label className="field flex h-11 items-center gap-2 rounded-md border border-border-strong bg-surface px-3">
          <Search className="size-5 text-text-secondary" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("addToTermSearch")}
            aria-label={t("addToTermSearch")}
            className="min-w-0 flex-1 bg-transparent type-body outline-none placeholder:text-text-secondary"
          />
        </label>
        <ul className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 && <li className="px-3 py-2 type-small text-text-secondary">{t("addToTermEmpty")}</li>}
          {results.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => add(c.code, c.credits)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left outline-none hover:bg-primary-soft focus-visible:bg-primary-soft"
              >
                <span className="min-w-0">
                  <span className="block truncate type-small-medium text-text">
                    {c.code} {c.nameEn}
                  </span>
                  {locale === "th" && <span className="block truncate type-caption text-text-secondary">{c.nameTh}</span>}
                </span>
                <span className="shrink-0 type-caption text-text-secondary">{tc("credits", { count: c.credits })}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
