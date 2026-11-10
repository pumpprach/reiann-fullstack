"use client";

import { Hourglass } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const NAV_KEYS = ["search", "courses", "exams", "groups", "sheets", "qa", "books"] as const;

/** Placeholder for screens designed in Figma but not built yet. */
export default function ComingSoonPage() {
  const { feature } = useParams<{ feature: string }>();
  const t = useTranslations("soon");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const name = (NAV_KEYS as readonly string[]).includes(feature) ? tn(feature as (typeof NAV_KEYS)[number]) : tc("comingSoon");

  return (
    <Card className="mx-auto mt-16 flex max-w-xl flex-col items-center gap-3 py-14 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-lg bg-info-bg text-info">
        <Hourglass className="size-7" aria-hidden />
      </span>
      <h1 className="type-h2 text-text">{t("title", { feature: name })}</h1>
      <p className="max-w-sm type-body text-text-secondary">{t("body")}</p>
      <Button variant="outline" asChild>
        <Link href="/">{t("back")}</Link>
      </Button>
    </Card>
  );
}
