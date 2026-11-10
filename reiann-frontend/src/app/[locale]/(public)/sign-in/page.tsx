"use client";

import { AlertTriangle, Calculator, CalendarClock, Check } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect } from "react";
import { Brand } from "@/components/app/brand";
import { Banner, Card } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { useProfile, useSignIn, useUser } from "@/data/hooks";
import { isSupabaseConfigured } from "@/data/supabase-client";
import { useRouter } from "@/i18n/navigation";

/** Only same-site paths are accepted for ?next= (no open redirect). */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

// useSearchParams needs a Suspense boundary so the page can still prerender.
export default function SignInPage() {
  return (
    <Suspense>
      <SignInPageInner />
    </Suspense>
  );
}

function SignInPageInner() {
  const t = useTranslations("signIn");
  const router = useRouter();
  const params = useSearchParams();
  const user = useUser();
  const profile = useProfile();
  const signIn = useSignIn();

  useEffect(() => {
    if (user.data && !profile.isPending) {
      router.replace(profile.data ? safeNext(params.get("next")) : "/onboarding/program");
    }
  }, [user.data, profile.data, profile.isPending, router, params]);

  return (
    <div className="flex min-h-dvh flex-col px-4 py-5 md:px-14 md:py-10">
      <Brand />
      <div className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 items-center gap-8 py-6 md:gap-12 md:py-10 lg:grid-cols-[1fr_480px]">
        <div className="max-w-xl">
          <p className="type-small text-text-secondary">{t("eyebrow")}</p>
          <h1 className="mt-2 type-display text-text">{t("headline")}</h1>
          <ul className="mt-8 flex flex-col gap-5">
            {[
              { Icon: Calculator, title: t("featureCalcTitle"), body: t("featureCalcBody") },
              { Icon: CalendarClock, title: t("featureScheduleTitle"), body: t("featureScheduleBody") },
            ].map(({ Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-alt">
                  <Icon className="size-5 text-text" aria-hidden />
                </span>
                <div>
                  <p className="type-body-medium text-text">{title}</p>
                  <p className="type-small text-text-secondary">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Card className="flex flex-col gap-5 p-5 shadow-sm md:p-8">
          <div>
            <h2 className="type-h2 text-text">{t("title")}</h2>
            <p className="mt-2 type-small text-text-secondary">{isSupabaseConfigured ? t("googleBody") : t("body")}</p>
          </div>
          <Button
            className="w-full"
            disabled={signIn.isPending}
            onClick={() => signIn.mutate()}
          >
            {isSupabaseConfigured ? t("googleButton") : t("demoButton")}
          </Button>
          {signIn.isError && <Banner tone="error">{t("error")}</Banner>}
          {isSupabaseConfigured ? (
            <Banner tone="info">{t("googleNote")}</Banner>
          ) : (
            <Banner tone="warning" title={t("demoNoteTitle")}>{t("demoNote")}</Banner>
          )}
          <div>
            <p className="mb-3 type-small-medium text-text">{t("storeTitle")}</p>
            <ul className="flex flex-col gap-3 type-small text-text">
              {[t("storeEmail"), t("storeGrades"), t("storeSchedule")].map((s) => (
                <li key={s} className="flex items-center gap-3">
                  <Check className="size-4 text-success" aria-hidden />
                  {s}
                </li>
              ))}
              <li className="flex items-center gap-3">
                <AlertTriangle className="size-4 text-text-secondary" aria-hidden />
                {t("storeNot")}
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
