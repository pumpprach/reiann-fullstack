"use client";

import { AlertTriangle, Check, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { burst } from "@/lib/confetti";
import { cn } from "cn";
import { Banner, FieldLabel, TextField } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { overlaps, slotIssue, type ClassSlot, type Weekday } from "@/core/schedule";
import { useDeleteSlot, useSaveSlot } from "@/data/hooks";
import { findCourse } from "@/mocks/courses";
import { CourseCombobox } from "./course-combobox";
import { GE_BY_CODE, GE_COURSES, GE_SOURCE } from "@/mocks/ge-courses";

interface Row {
  id: string;
  day: Weekday;
  start: string;
  end: string;
  kind: "lecture" | "lab";
}

/**
 * Figma: Schedule / Add Class Time (+ · Invalid).
 * Edits every time slot of one course at once.
 */
export function ClassDialog(props: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  courseCode: string | null;
  courseCodes: string[];
  allSlots: ClassSlot[];
}) {
  const tc = useTranslations("common");
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent closeLabel={tc("close")} className="sm:max-w-2xl">
        {/* Content unmounts when closed, so the form starts fresh on every open. */}
        <ClassForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

function rowsFor(code: string, allSlots: ClassSlot[]): Row[] {
  const existing = allSlots.filter((s) => s.courseCode === code);
  return existing.length
    ? existing.map((s) => ({ id: s.id, day: s.day, start: s.start, end: s.end, kind: s.kind }))
    : [{ id: crypto.randomUUID(), day: 0, start: "09:00", end: "12:00", kind: "lecture" }];
}

function ClassForm({
  onOpenChange,
  courseCode,
  courseCodes,
  allSlots,
}: {
  onOpenChange: (o: boolean) => void;
  courseCode: string | null;
  courseCodes: string[];
  allSlots: ClassSlot[];
}) {
  const t = useTranslations("classForm");
  const ts = useTranslations("schedule");
  const tc = useTranslations("common");
  const saveSlot = useSaveSlot();
  const deleteSlot = useDeleteSlot();

  const initial = courseCode ?? courseCodes[0] ?? "";
  const first = allSlots.find((s) => s.courseCode === initial);
  const [code, setCode] = useState(initial);
  const [section, setSection] = useState(first?.section ?? "");
  const [room, setRoom] = useState(first?.room ?? "");
  const [rows, setRows] = useState<Row[]>(() => rowsFor(initial, allSlots));
  const [tried, setTried] = useState(false);
  const editing = allSlots.some((s) => s.courseCode === code);

  function changeCourse(c: string) {
    setCode(c);
    setRows(rowsFor(c, allSlots));
    const f = allSlots.find((s) => s.courseCode === c);
    setSection(f?.section ?? "");
    setRoom(f?.room ?? "");
  }

  const others = allSlots.filter((s) => s.courseCode !== code);
  const issues = rows.map((r) => slotIssue(r));
  const firstBad = issues.findIndex(Boolean);
  const conflictOf = (r: Row) =>
    others.find((o) => overlaps({ ...o }, { ...r, id: r.id, courseCode: code }))?.courseCode;

  const setRow = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function onSave() {
    setTried(true);
    if (firstBad >= 0 || !code) return;
    const keep = new Set(rows.map((r) => r.id));
    for (const s of allSlots.filter((s) => s.courseCode === code && !keep.has(s.id))) await deleteSlot.mutateAsync(s.id);
    for (const r of rows) {
      await saveSlot.mutateAsync({ ...r, courseCode: code, room: room || undefined, section: section || undefined });
    }
    // Celebrate a new course only, not an edit to one already in the timetable.
    if (!editing) burst();
    toast.success(t("savedToast"));
    onOpenChange(false);
  }

  async function onDeleteCourse() {
    for (const s of allSlots.filter((s) => s.courseCode === code)) await deleteSlot.mutateAsync(s.id);
    toast(t("deletedToast", { code }));
    onOpenChange(false);
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle>{editing ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
          <div className="flex flex-col gap-1.5">
            <FieldLabel>{t("course")}</FieldLabel>
            <CourseCombobox
              value={code}
              onChange={changeCourse}
              disabled={!!courseCode}
              label={t("course")}
              placeholder={t("searchCourse")}
              emptyText={t("noCourseMatch")}
              groups={[
                { label: t("thisTerm"), courses: courseCodes.map((c) => findCourse(c)).filter((c) => c !== undefined) },
                { label: t("geCatalog"), courses: GE_COURSES.filter((g) => !courseCodes.includes(g.code)) },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="section" hint={t("optional")}>
              {t("section")}
            </FieldLabel>
            {GE_BY_CODE.has(code) ? (
              <Select value={section || undefined} onValueChange={setSection}>
                <SelectTrigger id="section" aria-label={t("section")}>
                  <SelectValue placeholder={t("pickSection")} />
                </SelectTrigger>
                <SelectContent>
                  {GE_BY_CODE.get(code)!.sections.map((sec) => (
                    <SelectItem key={sec.no} value={sec.no}>
                      {t("sectionOption", { no: sec.no, kind: ts(sec.kind), seats: sec.seats })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <TextField id="section" value={section} onChange={(e) => setSection(e.target.value)} placeholder="800" />
            )}
          </div>
        </div>

        {GE_BY_CODE.has(code) && (
          <p className="-mt-2 type-caption text-text-secondary">
            {t("geSectionNote", { term: GE_SOURCE.term, campus: GE_SOURCE.campus })}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <FieldLabel>{t("slots")}</FieldLabel>
          {rows.map((r, i) => {
            const bad = tried && !!issues[i];
            const conflict = !issues[i] && conflictOf(r);
            return (
              <div key={r.id} className="flex flex-col gap-1">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] items-center gap-2 max-sm:rounded-md max-sm:bg-surface-alt max-sm:p-2 sm:grid-cols-[120px_100px_100px_minmax(0,1fr)_36px]">
                  <Select value={String(r.day)} onValueChange={(v) => setRow(r.id, { day: Number(v) as Weekday })}>
                    <SelectTrigger aria-label={`${t("day")} ${i + 1}`} aria-invalid={bad || undefined} className="max-sm:col-span-2 max-sm:row-start-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {tc(`day.${d}` as "day.0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <TextField className="max-sm:row-start-2" aria-label={`${t("start")} ${i + 1}`} value={r.start} invalid={bad} onChange={(e) => setRow(r.id, { start: e.target.value })} />
                  <TextField className="max-sm:row-start-2" aria-label={`${t("end")} ${i + 1}`} value={r.end} invalid={bad} onChange={(e) => setRow(r.id, { end: e.target.value })} />
                  <div className="flex gap-2 max-sm:col-span-2 max-sm:row-start-3">
                    {(["lecture", "lab"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={r.kind === k}
                        onClick={() => setRow(r.id, { kind: k })}
                        className={cn(
                          "inline-flex h-9 items-center gap-1 rounded-full border px-3 type-small-medium",
                          r.kind === k ? "border-secondary-strong bg-secondary-soft" : "border-border-strong bg-surface",
                        )}
                      >
                        {r.kind === k && <Check className="size-4" aria-hidden />}
                        {ts(k)}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="max-sm:col-start-3 max-sm:row-start-1"
                    aria-label={t("removeSlot", { n: i + 1 })}
                    disabled={rows.length === 1}
                    onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {conflict && (
                  <p className="flex items-center gap-1.5 type-caption text-warning">
                    <AlertTriangle className="size-4" aria-hidden />
                    {t("conflict", { code: conflict })}
                  </p>
                )}
              </div>
            );
          })}
          {tried && firstBad >= 0 && (
            <Banner tone="error">
              {issues[firstBad] === "bad-time" ? t("invalidFormat", { n: firstBad + 1 }) : t("invalid", { n: firstBad + 1 })}
            </Banner>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setRows((rs) => [...rs, { id: crypto.randomUUID(), day: 2, start: "13:00", end: "15:00", kind: "lecture" }])}
          >
            <Plus /> {t("addSlot")}
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="room" hint={t("optional")}>
            {t("room")}
          </FieldLabel>
          <TextField id="room" value={room} onChange={(e) => setRoom(e.target.value)} placeholder={t("roomPlaceholder")} />
        </div>

        <DialogFooter className="items-center sm:justify-between">
          {editing ? (
            <Button variant="ghost" className="text-danger" onClick={onDeleteCourse}>
              <Trash2 /> {t("deleteCourse")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button onClick={onSave} disabled={saveSlot.isPending || (tried && firstBad >= 0)}>
              {tc("save")}
            </Button>
          </div>
        </DialogFooter>
        <p className="type-caption text-text-secondary">{t("footnote")}</p>
    </>
  );
}
