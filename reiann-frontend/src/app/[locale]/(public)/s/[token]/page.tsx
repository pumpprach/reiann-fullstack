"use client";

import { Lock } from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Brand } from "@/components/app/brand";
import { Card, Skeleton } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { useSharedSchedule } from "@/data/hooks";
import { DayList, Legend, WeekGrid } from "@/features/schedule/week-grid";
import { Link } from "@/i18n/navigation";
import { formatDate, formatTime, splitTerm } from "@/lib/format";

/**
 * Public page: opens without an account (frontend-flows §2).
 * Desktop shows the weekly grid; below 768px days become a vertical list
 * (Figma: Mobile / Shared Schedule · Viewer).
 */
export default function SharedSchedulePage() {
  const { token } = useParams<{ token: string }>();
  const t = useTranslations("viewer");
  const tc = useTranslations("common");
  const locale = useLocale();
  const q = useSharedSchedule(token);

  if (q.isPending) {
    return (
      <div className="p-4 md:p-8">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="mt-6 h-96 w-full" />
      </div>
    );
  }

  const data = q.data;
  if (!data) {
    return (
      <div className="flex min-h-dvh flex-col px-4 py-4 md:px-14 md:py-10">
        <Brand />
        <div className="flex flex-1 items-center justify-center">
          <Card className="flex w-full max-w-[486px] flex-col gap-3 p-6 md:p-8">
            <span className="inline-flex size-14 items-center justify-center rounded-lg bg-surface-alt">
              <Lock className="size-6 text-text" aria-hidden />
            </span>
            <h1 className="type-h2 text-text">{t("unavailableTitle")}</h1>
            <p className="type-body text-text-secondary">{t("unavailableBody")}</p>
            <Button variant="outline" asChild className="w-full md:w-auto md:self-start">
              <Link href="/">{t("goHome")}</Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const { year, sem } = splitTerm(data.term);
  const term = tc("term", { sem, year });
  const owner = data.ownerLabel;
  const names = data.showCourseNames;
  const meta = (names ? t("meta", { term, expires: formatDate(data.expiresAt, locale) }) : t("metaBusy", { term, expires: formatDate(data.expiresAt, locale) }));

  const compare = data.allowCompare && (
    <Card className="flex flex-col gap-3 border-primary">
      <h2 className="type-h3 text-text">{t("compareTitle")}</h2>
      <p className="type-small text-text-secondary">{t("compareBody")}</p>
      <Button asChild className="w-full">
        <Link href={`/sign-in?next=${encodeURIComponent("/soon/compare")}`}>{t("compareButton")}</Link>
      </Button>
      <p className="type-caption text-text-secondary">{t("compareNote", { owner })}</p>
    </Card>
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1440px] flex-col gap-5 px-4 py-4 md:gap-6 md:px-8 md:py-8">
      <div className="flex items-center justify-between">
        <Brand />
        <Button variant="outline" size="sm" asChild>
          <Link href="/sign-in">{t("signIn")}</Link>
        </Button>
      </div>
      <header>
        <p className="type-eyebrow text-text-secondary md:type-small">{t("eyebrow")}</p>
        <h1 className="type-h2 text-text md:type-h1">{t("title", { owner })}</h1>
        <p className="type-small text-text-secondary md:type-body">{meta}</p>
      </header>

      {/* Desktop / tablet: weekly grid */}
      <div className="hidden gap-6 md:grid md:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="type-h3 text-text">{names ? t("gridTitle", { owner }) : t("gridTitleBusy", { owner })}</h2>
            {names && <Legend />}
          </div>
          <WeekGrid slots={data.slots} showNames={names} />
          <p className="mt-4 type-caption text-text-secondary">
            {names ? t("note") : t("noteBusy")} · {t("updated", { time: formatTime(data.updatedAt, locale) })}
          </p>
        </Card>
        <div>{compare}</div>
      </div>

      {/* Mobile: days as a vertical list */}
      <div className="flex flex-col gap-5 md:hidden">
        <Card className="px-4 py-1">
          <DayList slots={data.slots} showNames={names} />
        </Card>
        {compare}
        <p className="type-caption text-text-muted">{names ? t("note") : t("noteBusy")}</p>
      </div>
    </div>
  );
}
