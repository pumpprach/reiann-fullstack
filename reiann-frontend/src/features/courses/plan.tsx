"use client";

import { Calculator, ChevronRight, Search, Shuffle, Waypoints } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { useNextTermPlan, useProfile, useSaveNextTermPlan } from "@/data/hooks";
import { Link, useRouter } from "@/i18n/navigation";
import { burst } from "@/lib/confetti";
import { PLAN_TERM } from "@/mocks/course-info";
import { FACULTIES, PROGRAM_OPTIONS, CS_PROGRAM } from "@/mocks/programs";

/** Index of the term the student is in now (year 2, first semester). */
export const CURRENT_INDEX = 2;
export const NEXT_INDEX = 3;

export const DEFAULT_NEXT_PLAN = Object.entries(PLAN_TERM)
  .filter(([, [y, s]]) => y === 2 && s === 2)
  .map(([c]) => c);

/**
 * Whether the selected program has study-plan data (frontend-flows §2 rule 6),
 * plus the next-term plan the student saved (or the curriculum default).
 */
export function usePlan() {
  const profile = useProfile();
  const saved = useNextTermPlan();
  const save = useSaveNextTermPlan();
  const option = PROGRAM_OPTIONS.find((p) => p.id === profile.data?.programId);
  return {
    isPending: profile.isPending || saved.isPending,
    hasPlan: !profile.data || profile.data.programId === CS_PROGRAM.id,
    program: option,
    faculty: FACULTIES.find((f) => f.id === option?.facultyId),
    nextPlan: saved.data ?? DEFAULT_NEXT_PLAN,
    savePlan: save.mutateAsync,
    saving: save.isPending,
  };
}

/** Add a course to next term's plan with a toast; used from the course page and the graph sheet. */
export function useAddToPlan() {
  const t = useTranslations("courses.detail");
  const router = useRouter();
  const { nextPlan, savePlan } = usePlan();
  return {
    inPlan: (code: string) => nextPlan.includes(code),
    add: async (code: string) => {
      await savePlan([...nextPlan, code]);
      burst();
      toast.success(t("addedToPlan", { code }), {
        action: { label: t("openPlan"), onClick: () => router.push("/courses/plan") },
      });
    },
  };
}

/** Figma: Curriculum Graph / No Plan Yet. Shown by every page that needs plan data. */
export function NoPlanYet({ title }: { title: string }) {
  const t = useTranslations("courses.noPlan");
  const { program, faculty } = usePlan();
  const [sent, setSent] = useState(false);
  const links = [
    { href: "/search", Icon: Search, tile: "bg-warning-bg text-warning", title: t("search"), sub: t("searchSub") },
    { href: "/calculator", Icon: Calculator, tile: "bg-info-bg text-info", title: t("calc"), sub: t("calcSub") },
    { href: "/onboarding/program?from=settings", Icon: Shuffle, tile: "bg-career-bg text-text dark:text-career", title: t("change"), sub: t("changeSub") },
  ];
  return (
    <div>
      {program && (
        <p className="type-small text-text-secondary">
          {program.nameEn} · {program.nameTh}
          {faculty && ` · ${faculty.nameEn}`}
        </p>
      )}
      <h1 className="type-h2 text-text md:type-h1">{title}</h1>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        <Card className="flex animate-pop-in flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="inline-flex size-14 animate-float items-center justify-center rounded-lg bg-secondary-soft text-text">
            <Waypoints className="size-7" aria-hidden />
          </span>
          <h2 className="type-h2 text-text">{t("title")}</h2>
          <p className="max-w-md type-body text-text-secondary">{t("body")}</p>
          <Button
            disabled={sent}
            onClick={() => {
              setSent(true);
              toast.success(t("notified"));
            }}
          >
            {t("notify")}
          </Button>
          <p className="type-small text-text-secondary">{t("count", { count: sent ? 4 : 3 })}</p>
        </Card>
        <div className="flex flex-col gap-3">
          <h2 className="type-h3 text-text">{t("meanwhile")}</h2>
          {links.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              style={{ "--i": i } as React.CSSProperties}
              className="stagger lift flex animate-rise-in items-center gap-3 rounded-lg border border-border bg-surface p-4 outline-none focus-visible:ring-3 focus-visible:ring-focus/30"
            >
              <span className={`inline-flex size-9 items-center justify-center rounded-sm ${l.tile}`}>
                <l.Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block type-small-medium text-text">{l.title}</span>
                <span className="block type-caption text-text-secondary">{l.sub}</span>
              </span>
              <ChevronRight className="size-5 text-text-secondary" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
      <p className="mt-6 type-caption text-text-secondary">{t("note")}</p>
    </div>
  );
}
