"use client";

import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useMemo, useState } from "react";
import { cn } from "cn";
import { Banner, Card, FieldLabel, Tag } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile, useSaveProfile } from "@/data/hooks";
import { useRouter } from "@/i18n/navigation";
import { CAMPUSES, FACULTIES, PROGRAM_OPTIONS, type ProgramStatus } from "@/mocks/programs";

function SearchBox(props: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="field flex h-11 items-center gap-2 rounded-md border border-border-strong bg-surface px-3">
      <Search className="size-5 text-text-secondary" aria-hidden />
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        aria-label={props.placeholder}
        className="min-w-0 flex-1 bg-transparent type-body outline-none placeholder:text-text-secondary"
      />
    </label>
  );
}

const statusTone: Record<ProgramStatus, "matcha" | "amber" | "neutral"> = {
  ready: "matcha",
  "in-progress": "amber",
  "not-ready": "neutral",
};

// useSearchParams needs a Suspense boundary so the page can still prerender.
export default function ChooseProgramPage() {
  return (
    <Suspense>
      <ChooseProgramPageInner />
    </Suspense>
  );
}

function ChooseProgramPageInner() {
  const t = useTranslations("program");
  const tc = useTranslations("common");
  const router = useRouter();
  const fromSettings = useSearchParams().get("from") === "settings";
  const profile = useProfile();
  const save = useSaveProfile();

  // Gate has already loaded the profile, so it can seed the initial choices.
  const saved = PROGRAM_OPTIONS.find((x) => x.id === profile.data?.programId);
  const [facultyId, setFacultyId] = useState(saved?.facultyId ?? "sci");
  const [programId, setProgramId] = useState(saved?.id ?? "cs-2565");
  const [campusId, setCampusId] = useState(profile.data?.campusId ?? "bkn");
  const [year, setYear] = useState(String(profile.data?.year ?? 2));
  const [qFaculty, setQFaculty] = useState("");
  const [qMajor, setQMajor] = useState("");

  // Already onboarded and not coming from settings → home (§2 rule 4).
  useEffect(() => {
    if (profile.data && profile.data.transcript !== "pending" && !fromSettings) router.replace("/");
  }, [profile.data, fromSettings, router]);

  const match = (s: string, q: string) => s.toLowerCase().includes(q.trim().toLowerCase());
  const faculties = FACULTIES.filter((f) => match(f.nameEn + f.nameTh, qFaculty));
  const faculty = FACULTIES.find((f) => f.id === facultyId)!;
  const majors = useMemo(
    () => PROGRAM_OPTIONS.filter((p) => p.facultyId === facultyId && match(p.nameEn + p.nameTh, qMajor)),
    [facultyId, qMajor],
  );
  const program = PROGRAM_OPTIONS.find((p) => p.id === programId && p.facultyId === facultyId);

  const statusLabel = (s: ProgramStatus) =>
    s === "ready" ? t("statusReady") : s === "in-progress" ? t("statusInProgress") : t("statusNotReady");

  async function start() {
    if (!program) return;
    await save.mutateAsync({
      programId: program.id,
      campusId,
      year: Number(year),
      transcript: profile.data?.transcript ?? "pending",
      transcriptIssued: profile.data?.transcriptIssued,
    });
    router.push(fromSettings && profile.data?.transcript !== "pending" ? "/" : "/onboarding/transcript");
  }

  const rowCls = (active: boolean) =>
    cn(
      "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-focus/30",
      active ? "border-secondary-strong bg-secondary-soft" : "border-transparent hover:bg-surface-hover",
    );

  return (
    <div>
      <p className="type-small text-text-secondary">{t("eyebrow")}</p>
      <h1 className="type-h1 text-text">{t("title")}</h1>
      <p className="mt-1 type-body text-text-secondary">{t("body")}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:mt-8 md:grid-cols-2 md:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_340px]">
        <Card className="flex flex-col gap-3">
          <h2 className="type-h3 text-text">{t("faculties")}</h2>
          <SearchBox value={qFaculty} onChange={setQFaculty} placeholder={t("searchFaculty")} />
          <div className="flex flex-col gap-1" role="listbox" aria-label={t("faculties")}>
            {faculties.length === 0 && <p className="p-3 type-small text-text-muted">{t("noMatch")}</p>}
            {faculties.map((f) => (
              <button
                key={f.id}
                role="option"
                aria-selected={f.id === facultyId}
                className={rowCls(f.id === facultyId)}
                onClick={() => {
                  setFacultyId(f.id);
                  const first = PROGRAM_OPTIONS.find((p) => p.facultyId === f.id);
                  if (first) setProgramId(first.id);
                }}
              >
                <span>
                  <span className="block type-small-medium text-text">{f.nameEn}</span>
                  <span className="block type-caption text-text-secondary">{f.nameTh}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="type-h3 text-text">{t("majorsIn", { faculty: faculty.nameEn })}</h2>
          <SearchBox value={qMajor} onChange={setQMajor} placeholder={t("searchMajor")} />
          <div className="flex flex-col gap-1" role="listbox" aria-label={t("majorsIn", { faculty: faculty.nameEn })}>
            {majors.length === 0 && <p className="p-3 type-small text-text-muted">{t("noMatch")}</p>}
            {majors.map((p) => (
              <button
                key={p.id}
                role="option"
                aria-selected={p.id === programId}
                className={rowCls(p.id === programId)}
                onClick={() => setProgramId(p.id)}
              >
                <span>
                  <span className="block type-small-medium text-text">{p.nameEn}</span>
                  <span className="block type-caption text-text-secondary">{p.nameTh}</span>
                </span>
                <Tag tone={statusTone[p.status]} dot>
                  {statusLabel(p.status)}
                </Tag>
              </button>
            ))}
          </div>
          <p className="mt-auto pt-2 type-small-medium text-text">{t("missing")}</p>
        </Card>

        <Card className="flex flex-col gap-4 self-start">
          <h2 className="type-h3 text-text">{t("selected")}</h2>
          {program ? (
            <>
              <div>
                <p className="type-body-medium text-text">{program.nameEn}</p>
                <p className="type-caption text-text-secondary">
                  {program.nameTh} · {faculty.nameEn}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>{t("campus")}</FieldLabel>
                <Select value={campusId} onValueChange={setCampusId}>
                  <SelectTrigger aria-label={t("campus")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPUSES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nameEn} · {c.nameTh}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>{t("curriculum")}</FieldLabel>
                <Select value="2565">
                  <SelectTrigger aria-label={t("curriculum")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2565">{t("curriculumValue", { year: 2565 })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>{t("yearLabel")}</FieldLabel>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger aria-label={t("yearLabel")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "4"].map((y) => (
                      <SelectItem key={y} value={y}>
                        {tc("year", { year: y })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {program.status === "ready" ? (
                <Banner tone="success" title={t("readyTitle")}>
                  {t("readyBody")}
                </Banner>
              ) : (
                <Banner tone="warning" title={t("notReadyTitle")}>
                  {t("notReadyBody")}
                </Banner>
              )}
              <Button onClick={start} disabled={save.isPending}>
                {t("start")}
              </Button>
            </>
          ) : (
            <p className="type-small text-text-muted">{t("noMatch")}</p>
          )}
        </Card>
      </div>
      <p className="mt-6 type-caption text-text-secondary">{t("footnote")}</p>
    </div>
  );
}
