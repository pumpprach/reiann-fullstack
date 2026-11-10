"use client";

import { FileText, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { Banner, ProgressBar } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { useSkipTranscript } from "@/data/hooks";
import { isSupabaseConfigured } from "@/data/supabase-client";
import { checkFile, saveDraft, type FileProblem } from "@/features/transcript/draft";
import { useRouter } from "@/i18n/navigation";
import { SAMPLE_TRANSCRIPT, TRANSCRIPT_ISSUED, UNREADABLE } from "@/mocks/transcript";

type Phase =
  | { kind: "idle" }
  | { kind: "error"; file: string; problem: FileProblem }
  | { kind: "reading"; file: string; progress: number };

export default function TranscriptUploadPage() {
  const t = useTranslations("transcript");
  const tc = useTranslations("common");
  const router = useRouter();
  const skip = useSkipTranscript();
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);

  // Demo: simulate reading the PDF on the device, then hand the sample
  // transcript to Review. The real pdf.js reader replaces this later.
  useEffect(() => {
    if (phase.kind !== "reading") return;
    if (phase.progress >= 100) {
      saveDraft({
        fileName: phase.file,
        issued: TRANSCRIPT_ISSUED,
        records: SAMPLE_TRANSCRIPT,
        unreadable: [...UNREADABLE],
      });
      router.push("/onboarding/review");
      return;
    }
    const id = setTimeout(() => setPhase({ ...phase, progress: phase.progress + 20 }), 300);
    return () => clearTimeout(id);
  }, [phase, router]);

  function accept(file: File | undefined) {
    if (!file) return;
    const problem = checkFile(file);
    setPhase(problem ? { kind: "error", file: file.name, problem } : { kind: "reading", file: file.name, progress: 0 });
  }

  async function skipToManual() {
    await skip.mutateAsync();
    router.push(isSupabaseConfigured ? "/courses" : "/calculator");
  }

  const reading = phase.kind === "reading";
  const error = phase.kind === "error";

  // A real PDF reader needs verified KU transcript samples. Do not save the
  // demo transcript as if it came from a student's uploaded file.
  if (isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-[904px]">
        <h1 className="type-h1 text-text">{t("uploadTitle")}</h1>
        <Banner tone="info" className="mt-6">{t("manualOnly")}</Banner>
        <Button className="mt-6" onClick={skipToManual} disabled={skip.isPending}>
          {t("manualButton")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[904px]">
      <p className="type-small text-text-secondary">{t("step", { step: 2 })}</p>
      <h1 className="type-h1 text-text">{t("uploadTitle")}</h1>
      <p className="mt-1 type-body text-text-secondary">{t("uploadBody")}</p>

      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-label={t("choose")}
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div
        onDragOver={(e) => {
          if (reading) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!reading) accept(e.dataTransfer.files[0]);
        }}
        className={cn(
          "mt-8 flex flex-col items-center gap-3 rounded-lg border-[1.5px] bg-surface px-10 py-12 text-center",
          error ? "border-error" : reading ? "border-border" : "border-dashed border-border-strong",
          dragging && "border-solid border-focus bg-primary-soft",
        )}
      >
        <span
          className={cn(
            "inline-flex size-14 items-center justify-center rounded-lg",
            error ? "bg-error-bg text-error" : "bg-surface-alt text-text",
          )}
        >
          <FileText className="size-7" aria-hidden />
        </span>

        {phase.kind === "idle" && (
          <>
            <p className="type-h3 text-text">{t("dropTitle")}</p>
            <p className="type-small text-text-secondary">{t("dropHint")}</p>
            <Button className="mt-2" onClick={() => input.current?.click()}>
              {t("choose")}
            </Button>
          </>
        )}

        {phase.kind === "reading" && (
          <>
            <p className="type-h3 text-text">{t("readingTitle", { file: phase.file })}</p>
            <p className="type-small text-text-secondary">
              {t("readingHint", { page: Math.min(2, 1 + Math.floor(phase.progress / 50)), pages: 2 })}
            </p>
            <ProgressBar value={phase.progress} className="mt-2 max-w-[420px]" label={t("readingTitle", { file: phase.file })} />
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setPhase({ kind: "idle" })}>
              {tc("cancel")}
            </Button>
          </>
        )}

        {phase.kind === "error" && (
          <>
            <p className="type-h3 text-text">{t("errorTitle")}</p>
            <p className="type-small text-text-secondary">
              {phase.problem === "type" ? t("errorType", { file: phase.file }) : t("errorSize", { file: phase.file })}
            </p>
            <div className="mt-2 w-full max-w-[520px] rounded-md bg-error-bg p-4 text-left type-small text-text">
              <p className="type-small-medium">{t("rulesTitle")}</p>
              <ul className="mt-1 list-disc pl-5">
                <li>{t("rule1")}</li>
                <li>{t("rule2")}</li>
                <li>{t("rule3")}</li>
              </ul>
            </div>
            <Button className="mt-2" onClick={() => input.current?.click()}>
              {t("chooseAgain")}
            </Button>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 type-small text-text-secondary">
          <Lock className="size-4" aria-hidden />
          {t("privacy")}
        </p>
        <Button variant="link" onClick={skipToManual} disabled={skip.isPending || reading}>
          {t("skip")}
        </Button>
      </div>
      <Banner tone="info" className="mt-6">
        {t("demoNote")}
      </Banner>
    </div>
  );
}
