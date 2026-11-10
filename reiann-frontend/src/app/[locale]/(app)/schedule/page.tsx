"use client";

import { CalendarClock, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/shell";
import { Banner, Card, Skeleton, Tag } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { conflictingIds, overlaps } from "@/core/schedule";
import { useShareLinks, useSlots } from "@/data/hooks";
import { ClassDialog } from "@/features/schedule/class-dialog";
import { LinkRow, ShareDialog, type ShareTab } from "@/features/schedule/share-dialog";
import { DayList, Legend, WeekGrid } from "@/features/schedule/week-grid";
import { useStudent } from "@/features/student";
import { Link } from "@/i18n/navigation";
import { findCourse } from "@/mocks/courses";

export default function SchedulePage() {
  const t = useTranslations("schedule");
  const tc = useTranslations("common");
  const slots = useSlots();
  const links = useShareLinks();
  const student = useStudent();
  const [editing, setEditing] = useState<{ open: boolean; code: string | null }>({ open: false, code: null });
  const [share, setShare] = useState<{ open: boolean; tab: ShareTab }>({ open: false, tab: "link" });

  const all = useMemo(() => slots.data ?? [], [slots.data]);
  const conflicts = useMemo(() => conflictingIds(all), [all]);
  // Courses this term: from the transcript, else whatever has times.
  const current = student.current;
  const codes = useMemo(
    () => [...new Set([...current.map((r) => r.code), ...all.map((s) => s.courseCode)])],
    [current, all],
  );
  const credits = codes.reduce((n, c) => n + (findCourse(c)?.credits ?? 0), 0);
  const conflictPairs = useMemo(() => {
    const pairs: [string, string, number][] = [];
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++)
        if (overlaps(all[i], all[j])) pairs.push([all[i].courseCode, all[j].courseCode, all[i].day]);
    return pairs;
  }, [all]);

  const term = tc("term", { sem: "1", year: 2569 });

  if (slots.isPending) return <Skeleton className="h-[600px] w-full" />;

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow", { term })}
        title={t("title")}
        subtitle={t("summary", { courses: codes.length, credits })}
        actions={
          <Button onClick={() => setEditing({ open: true, code: null })}>
            <Plus /> {t("addTime")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="self-start">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="type-h3 text-text">{t("week")}</h2>
              {all.length > 0 && (
                <Tag tone={conflicts.size ? "strawberry" : "matcha"} dot>
                  {conflicts.size ? t("conflicts", { count: conflictPairs.length }) : t("noConflict")}
                </Tag>
              )}
            </div>
            <Legend />
          </div>
          {conflictPairs.map(([a, b, day]) => (
            <Banner key={`${a}-${b}-${day}`} tone="warning" className="mb-3">
              {t("conflictBanner", { a, b, day: tc(`day.${day}` as "day.0") })}
            </Banner>
          ))}
          {all.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="inline-flex size-14 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <CalendarClock className="size-7" aria-hidden />
              </span>
              <h3 className="type-h2 text-text">{t("emptyTitle")}</h3>
              <p className="max-w-md type-body text-text-secondary">{t("emptyBody")}</p>
              <Button onClick={() => setEditing({ open: true, code: null })}>
                <Plus /> {t("addTime")}
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <WeekGrid slots={all} conflicts={conflicts} onSelect={(s) => setEditing({ open: true, code: s.courseCode })} />
              </div>
              <div className="md:hidden">
                <DayList slots={all} conflicts={conflicts} onSelect={(s) => setEditing({ open: true, code: s.courseCode })} />
              </div>
            </>
          )}
          <p className="mt-4 type-caption text-text-secondary">{t("footnote")}</p>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:flex xl:flex-col">
          <Card className="flex flex-col gap-3 self-start">
            <div className="flex items-center justify-between">
              <h2 className="type-h3 text-text">{t("shareTitle")}</h2>
              <Tag tone="neutral" dot>
                {t("private")}
              </Tag>
            </div>
            <p className="type-small text-text-secondary">{t("shareBody")}</p>
            {(links.data ?? []).length === 0 ? (
              <p className="rounded-md bg-surface-alt p-3 type-small text-text-secondary">{t("noLinks")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {links.data!.slice(0, 2).map((l) => (
                  <LinkRow key={l.token} link={l} />
                ))}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="soft" onClick={() => setShare({ open: true, tab: "link" })}>
                {t("createLink")}
              </Button>
              <Button variant="soft" onClick={() => setShare({ open: true, tab: "wallpaper" })} disabled={all.length === 0}>
                {t("saveImage")}
              </Button>
            </div>
            <Button variant="outline" asChild>
              <Link href="/soon/compare">{t("compare")}</Link>
            </Button>
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="type-h3 text-text">{t("coursesTitle")}</h2>
            <ul className="flex flex-col">
              {codes.map((code) => {
                const c = findCourse(code);
                const hasTime = all.some((s) => s.courseCode === code);
                return (
                  <li key={code} className="flex items-start justify-between gap-3 py-1.5">
                    <span className="min-w-0 type-small text-text">
                      <span className="type-small-medium">{code}</span> {c?.nameEn}
                      {!hasTime && (
                        <button className="ml-2 align-middle" onClick={() => setEditing({ open: true, code })}>
                          <Tag tone="amber">{t("noTime")}</Tag>
                        </button>
                      )}
                    </span>
                    <span className="shrink-0 type-caption text-text-secondary">{tc("credits", { count: c?.credits ?? 0 })}</span>
                  </li>
                );
              })}
            </ul>
            <p className="flex items-center justify-between gap-3 border-t border-border pt-3 type-small-medium text-text">
              <span>{t("coursesTotal", { count: codes.length })}</span>
              <span>{tc("credits", { count: codes.reduce((n, code) => n + (findCourse(code)?.credits ?? 0), 0) })}</span>
            </p>
          </Card>
        </div>
      </div>

      <ClassDialog
        open={editing.open}
        onOpenChange={(open) => setEditing((e) => ({ ...e, open }))}
        courseCode={editing.code}
        courseCodes={codes.length ? codes : ["01418211"]}
        allSlots={all}
      />
      <ShareDialog
        open={share.open}
        onOpenChange={(open) => setShare((s) => ({ ...s, open }))}
        tab={share.tab}
        onTabChange={(tab) => setShare((s) => ({ ...s, tab }))}
        slots={all}
        courseCount={codes.length}
      />
    </>
  );
}
