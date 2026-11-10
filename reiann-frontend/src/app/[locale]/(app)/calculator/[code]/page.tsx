"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Banner, Skeleton } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { useCalculator } from "@/data/hooks";
import { CalculatorView } from "@/features/calculator/calculator-view";
import { Link } from "@/i18n/navigation";
import { findCourse } from "@/mocks/courses";

export default function CalculatorPage() {
  const { code } = useParams<{ code: string }>();
  const t = useTranslations("calculator");
  const tc = useTranslations("notFound");
  const course = findCourse(code);
  const calc = useCalculator(code);

  if (!course) {
    return (
      <Banner tone="warning" title={t("notFound", { code })} action={<Button size="sm" variant="outline" asChild><Link href="/calculator">{tc("home")}</Link></Button>} />
    );
  }
  if (calc.isPending || !calc.data) return <Skeleton className="h-[600px] w-full" />;
  // key: remount with fresh state when switching course
  return <CalculatorView key={code} course={course} initial={calc.data} />;
}
