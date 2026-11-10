"use client";

import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/app/shell";
import { Banner, Card } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { useProfile, useResetDemo, useSignOut, useUser } from "@/data/hooks";
import { isSupabaseConfigured } from "@/data/supabase-client";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { clearDraft } from "@/features/transcript/draft";
import { FACULTIES, PROGRAM_OPTIONS } from "@/mocks/programs";

/** Account settings and application-data reset. */
export default function SettingsPage() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const user = useUser().data;
  const profile = useProfile().data;
  const signOut = useSignOut();
  const reset = useResetDemo();
  const program = PROGRAM_OPTIONS.find((p) => p.id === profile?.programId);
  const faculty = FACULTIES.find((f) => f.id === program?.facultyId);

  const row = (title: string, body: React.ReactNode, action: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4 rounded-md bg-surface-alt px-4 py-3">
      <div className="min-w-0">
        <p className="type-small-medium text-text">{title}</p>
        <p className="type-caption text-text-secondary">{body}</p>
      </div>
      {action}
    </div>
  );

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      <div className="flex max-w-3xl flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <h2 className="type-h3 text-text">{t("account")}</h2>
          {row(
            isSupabaseConfigured ? t("googleAccount") : t("demoAccount"),
            user?.email,
            <Button variant="outline" size="sm" onClick={async () => { await signOut.mutateAsync(); router.replace("/sign-in"); }}>
              {t("signOut")}
            </Button>,
          )}
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="type-h3 text-text">{t("program")}</h2>
          {row(
            `${program?.nameEn ?? "–"} · ${faculty?.nameEn ?? ""}`,
            program?.nameTh,
            <Button variant="outline" size="sm" asChild>
              <Link href="/onboarding/program?from=settings">{t("change")}</Link>
            </Button>,
          )}
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="type-h3 text-text">{t("grades")}</h2>
          {row(
            profile?.transcriptIssued ? t("transcriptAt", { issued: formatDate(profile.transcriptIssued, locale) }) : t("transcriptNone"),
            "",
            <Button variant="outline" size="sm" asChild>
              <Link href={isSupabaseConfigured ? "/courses" : "/onboarding/transcript"}>
                {isSupabaseConfigured ? t("editCourses") : t("reupload")}
              </Link>
            </Button>,
          )}
          <p className="type-caption text-text-secondary">{t("phaseNote")}</p>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="type-h3 text-text">{isSupabaseConfigured ? t("cloudData") : t("demoData")}</h2>
          <Banner tone="info">{isSupabaseConfigured ? t("cloudDataBody") : t("demoDataBody")}</Banner>
          <Button
            variant="danger"
            className="self-start"
            onClick={async () => {
              if (!window.confirm(isSupabaseConfigured ? t("cloudResetConfirm") : t("resetConfirm"))) return;
              await reset.mutateAsync();
              clearDraft();
              router.replace("/sign-in");
            }}
          >
            {isSupabaseConfigured ? t("cloudReset") : t("reset")}
          </Button>
        </Card>
      </div>
    </>
  );
}
