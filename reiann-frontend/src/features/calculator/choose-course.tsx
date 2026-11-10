"use client";

import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStudent } from "@/features/student";
import { useRouter } from "@/i18n/navigation";
import { CATALOG, findCourse } from "@/mocks/courses";

export function ChooseCourseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations("calculator");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { current } = useStudent();
  const [q, setQ] = useState("");

  const currentCodes = new Set(current.map((r) => r.code));
  const match = (code: string) => {
    const c = findCourse(code);
    const hay = `${code} ${c?.nameEn ?? ""} ${c?.nameTh ?? ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  };
  const currentList = [...currentCodes].filter(match);
  const others = CATALOG.filter((c) => !currentCodes.has(c.code) && match(c.code));

  const pick = (code: string) => {
    onOpenChange(false);
    router.push(`/calculator/${code}`);
  };

  const row = (code: string) => {
    const c = findCourse(code)!;
    return (
      <li key={code}>
        <button
          onClick={() => pick(code)}
          className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
        >
          <span className="min-w-0">
            <span className="block truncate type-small-medium text-text">
              {code} {c.nameEn}
            </span>
            {locale === "th" && <span className="block truncate type-caption text-text-secondary">{c.nameTh}</span>}
          </span>
          <span className="shrink-0 type-caption text-text-secondary">{tc("credits", { count: c.credits })}</span>
        </button>
      </li>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("chooseTitle")}</DialogTitle>
          <DialogDescription>{t("chooseBody", { term: tc("term", { sem: "1", year: 2569 }) })}</DialogDescription>
        </DialogHeader>
        <label className="field flex h-11 items-center gap-2 rounded-md border border-border-strong bg-surface px-3">
          <Search className="size-5 text-text-secondary" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("chooseSearch")}
            aria-label={t("chooseSearch")}
            className="min-w-0 flex-1 bg-transparent type-body outline-none placeholder:text-text-secondary"
          />
        </label>
        <div className="max-h-[50vh] overflow-y-auto">
          {currentList.length > 0 && (
            <>
              <p className="px-3 pt-1 pb-1 type-eyebrow text-text-secondary">{t("chooseCurrent")}</p>
              <ul>{currentList.map(row)}</ul>
            </>
          )}
          {others.length > 0 && (
            <>
              <p className="px-3 pt-3 pb-1 type-eyebrow text-text-secondary">{t("chooseOther")}</p>
              <ul>{others.map((c) => row(c.code))}</ul>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
