"use client";

import { Calculator } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/shell";
import { Card, Skeleton } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { useLastCalculatorCode } from "@/data/hooks";
import { ChooseCourseDialog } from "@/features/calculator/choose-course";
import { useStudent } from "@/features/student";
import { Link, useRouter } from "@/i18n/navigation";

/** Opens the last course used, else the first course in progress, else the No Transcript state. */
export default function CalculatorIndex() {
  const t = useTranslations("calculator");
  const tn = useTranslations("nav");
  const th = useTranslations("home");
  const router = useRouter();
  const last = useLastCalculatorCode();
  const student = useStudent();
  const [choosing, setChoosing] = useState(false);

  const target = last.data ?? student.current[0]?.code ?? null;
  const ready = !last.isPending && !student.isPending;

  useEffect(() => {
    if (ready && target) router.replace(`/calculator/${target}`);
  }, [ready, target, router]);

  if (!ready || target) return <Skeleton className="h-96 w-full" />;

  return (
    <>
      <PageHeader title={tn("calculator")} />
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-lg bg-warning-bg text-warning">
          <Calculator className="size-7" aria-hidden />
        </span>
        <h2 className="type-h2 text-text">{t("noTranscriptTitle")}</h2>
        <p className="max-w-md type-body text-text-secondary">{t("noTranscriptBody")}</p>
        <div className="mt-2 flex gap-2">
          <Button asChild>
            <Link href="/onboarding/transcript">{th("uploadTranscript")}</Link>
          </Button>
          <Button variant="outline" onClick={() => setChoosing(true)}>
            {t("pickManually")}
          </Button>
        </div>
      </Card>
      <ChooseCourseDialog open={choosing} onOpenChange={setChoosing} />
    </>
  );
}
