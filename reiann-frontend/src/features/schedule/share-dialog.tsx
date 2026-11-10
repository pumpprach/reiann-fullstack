"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { Banner, Chip, FieldLabel, Segmented, TextField } from "@/components/reiann";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hourRange, type ClassSlot } from "@/core/schedule";
import { useCreateShareLink, useRevokeShareLink, useShareLinks } from "@/data/hooks";
import type { ShareLink } from "@/data/repository";
import { isSupabaseConfigured } from "@/data/supabase-client";
import {
  drawWallpaper,
  frameFor,
  pixelSize,
  saveCanvas,
  THEMES,
  type WallpaperOptions,
  type WallpaperOrientation,
  type WallpaperSize,
  type WallpaperTheme,
} from "@/features/wallpaper/render";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { findCourse } from "@/mocks/courses";

export type ShareTab = "link" | "wallpaper";

export function shareUrl(token: string) {
  return `${window.location.origin}/s/${token}`;
}

function CheckRow({ checked, onChange, children, disabled }: { checked: boolean; onChange?: (v: boolean) => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <label className={cn("flex items-center gap-3 type-body text-text", disabled && "text-text-secondary")}>
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={(v) => onChange?.(v === true)} className="size-5 rounded-sm border-border-strong data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-on-primary" />
      {children}
    </label>
  );
}

export function LinkRow({ link }: { link: ShareLink }) {
  const t = useTranslations("schedule");
  const tc = useTranslations("common");
  const locale = useLocale();
  const revoke = useRevokeShareLink();
  return (
    <li className="flex flex-col gap-2 rounded-md bg-surface-alt p-3">
      <p className="type-small-medium text-text">{link.name}</p>
      <p className="type-caption text-text-secondary">
        {t("linkMeta", { created: formatDate(link.createdAt, locale), expires: formatDate(link.expiresAt, locale) })}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(shareUrl(link.token));
            toast.success(tc("copied"));
          }}
        >
          <Copy /> {t("copyLink")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => revoke.mutate(link.token)} disabled={revoke.isPending}>
          {t("revoke")}
        </Button>
      </div>
    </li>
  );
}

export function ShareDialog({
  open,
  onOpenChange,
  tab,
  onTabChange,
  slots,
  courseCount,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tab: ShareTab;
  onTabChange: (t: ShareTab) => void;
  slots: ClassSlot[];
  courseCount: number;
}) {
  const t = useTranslations("share");
  const tc = useTranslations("common");
  const term = tc("term", { sem: "1", year: 2569 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")} className="sm:max-w-[980px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle", { term, courses: courseCount })}</DialogDescription>
        </DialogHeader>
        <Segmented<ShareTab>
          label={t("title")}
          value={tab}
          onChange={onTabChange}
          options={[
            { value: "link", label: t("tabLink") },
            { value: "wallpaper", label: t("tabWallpaper") },
          ]}
          className="self-start"
        />
        {tab === "link" ? <LinkTab /> : <WallpaperTab slots={slots} term={term} />}
      </DialogContent>
    </Dialog>
  );
}

function LinkTab() {
  const t = useTranslations("share");
  const tc = useTranslations("common");
  const create = useCreateShareLink();
  const links = useShareLinks();
  const [name, setName] = useState("");
  const [expires, setExpires] = useState<7 | 30 | null>(30);
  const [names, setNames] = useState(true);
  const [compare, setCompare] = useState(true);
  const [created, setCreated] = useState<ShareLink | null>(null);

  async function onCreate() {
    const link = await create.mutateAsync({
      name: name.trim() || t("defaultName"),
      expiresInDays: expires,
      showCourseNames: names,
      allowCompare: compare,
    });
    setCreated(link);
  }

  async function copy() {
    if (!created) return;
    await navigator.clipboard.writeText(shareUrl(created.token));
    toast.success(t("copiedToast"));
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="link-name">{t("linkName")}</FieldLabel>
          <TextField id="link-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("linkNamePlaceholder")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel>{t("expires")}</FieldLabel>
          <div className="flex gap-2">
            {([
              [7, t("days7")],
              [30, t("days30")],
              [null, t("termEnd")],
            ] as const).map(([v, label]) => (
              <Chip key={String(v)} selected={expires === v} onClick={() => setExpires(v)}>
                {expires === v && <Check className="size-4" aria-hidden />}
                {label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel>{t("visibleTitle")}</FieldLabel>
          <CheckRow checked disabled>
            {t("visibleBusy")}
          </CheckRow>
          <CheckRow checked={names} onChange={setNames}>
            {t("visibleNames")}
          </CheckRow>
          <CheckRow checked={compare} onChange={setCompare}>
            {t("visibleCompare")}
          </CheckRow>
        </div>
        {created ? (
          <div className="flex items-center justify-between gap-3 rounded-md bg-primary-soft px-4 py-3">
            <span className="truncate type-small text-text">{shareUrl(created.token)}</span>
            <Button size="sm" variant="soft" onClick={copy}>
              <Copy /> {tc("copy")}
            </Button>
          </div>
        ) : (
          <Button className="self-start" onClick={onCreate} disabled={create.isPending}>
            {t("create")}
          </Button>
        )}
        <p className="type-caption text-text-secondary">{t("never")}</p>
        {!isSupabaseConfigured && <Banner
          tone="info"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/s/demo" target="_blank">
                <ExternalLink /> {t("openDemo")}
              </Link>
            </Button>
          }
        >
          {t("demoNote")}
        </Banner>}
      </div>
      <div className="flex flex-col gap-3 rounded-lg bg-surface-alt/60 p-4">
        <p className="type-body-medium text-text">{t("openLinks")}</p>
        <ul className="flex flex-col gap-2">
          {(links.data ?? []).map((l) => (
            <LinkRow key={l.token} link={l} />
          ))}
        </ul>
        <p className="type-caption text-text-secondary">{t("openLinksNote")}</p>
      </div>
    </div>
  );
}

function WallpaperTab({ slots, term }: { slots: ClassSlot[]; term: string }) {
  const t = useTranslations("share");
  const tc = useTranslations("common");
  const preview = useRef<HTMLCanvasElement>(null);
  const [o, setO] = useState<WallpaperOptions>({
    size: "phone",
    orientation: "portrait",
    theme: "matcha",
    showCode: true,
    showName: false,
    showRoom: false,
    hideWeekend: true,
    trimHours: true,
    clockSpace: true,
  });
  const [saving, setSaving] = useState(false);
  const [h0, h1] = hourRange(slots, [8, 17]);
  const dayShort = [0, 1, 2, 3, 4, 5, 6].map((d) => tc(`dayShort.${d}` as "dayShort.0"));

  const input = () => ({
    slots,
    title: t("imageTitle", { term }),
    dayShort,
    courseName: (code: string) => findCourse(code)?.nameEn ?? code,
    category: (code: string) => findCourse(code)?.category,
    fontFamily: getComputedStyle(document.body).fontFamily,
  });

  useEffect(() => {
    let cancelled = false;
    // Draw only after fonts load so the image never uses a fallback font.
    document.fonts.ready.then(() => {
      if (!cancelled && preview.current) drawWallpaper(preview.current, input(), o, 1);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o, slots]);

  async function onSave() {
    setSaving(true);
    try {
      await document.fonts.ready;
      const canvas = document.createElement("canvas");
      drawWallpaper(canvas, input(), o);
      const file = `${t("fileName", { year: 2569 })}.png`;
      await saveCanvas(canvas, file);
      toast.success(t("savedImage", { file }));
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) toast.error(String(e));
    } finally {
      setSaving(false);
    }
  }

  const px = pixelSize(o.size, o.orientation);
  const F = frameFor(o.size, o.orientation);
  const landscape = F.w > F.h;
  // Preview fits a 300×420 box, whatever the shape.
  const previewW = Math.min(300, (420 * F.w) / F.h);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[340px_minmax(0,1fr)] md:gap-8">
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-surface-alt p-4 md:p-6">
        <canvas
          ref={preview}
          className={cn("max-w-full border-[5px] border-border-strong", landscape ? "rounded-[14px]" : "rounded-[22px]")}
          style={{ width: previewW, aspectRatio: `${F.w} / ${F.h}` }}
          aria-label={t("previewCaption", { w: px.w, h: px.h })}
          role="img"
        />
        <p className="type-caption text-text-secondary">{t("previewCaption", { w: px.w, h: px.h })}</p>
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <FieldLabel>{t("size")}</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {(["phone", "tablet", "desktop"] as WallpaperSize[]).map((s) => (
              <Chip key={s} selected={o.size === s} onClick={() => setO({ ...o, size: s })}>
                {o.size === s && <Check className="size-4" aria-hidden />}
                {t(s === "phone" ? "sizePhone" : s === "tablet" ? "sizeTablet" : "sizeDesktop")}
              </Chip>
            ))}
          </div>
          <p className="type-caption text-text-secondary">{t("sizeHint")}</p>
        </div>
        {o.size === "tablet" && (
          <div className="flex flex-col gap-2">
            <FieldLabel>{t("orientation")}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {(["portrait", "landscape"] as WallpaperOrientation[]).map((or) => (
                <Chip key={or} selected={o.orientation === or} onClick={() => setO({ ...o, orientation: or })}>
                  {o.orientation === or && <Check className="size-4" aria-hidden />}
                  {t(or === "portrait" ? "portrait" : "landscape")}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <FieldLabel>{t("background")}</FieldLabel>
          <div className="flex flex-wrap gap-4">
            {(Object.keys(THEMES) as WallpaperTheme[]).map((th) => (
              <button key={th} type="button" onClick={() => setO({ ...o, theme: th })} className="flex flex-col items-center gap-1 type-caption text-text-secondary" aria-pressed={o.theme === th}>
                <span
                  className={cn("size-9 rounded-full border", o.theme === th ? "border-[3px] border-primary" : "border-border-strong")}
                  style={{ background: THEMES[th].bg }}
                />
                {th[0].toUpperCase() + th.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel>{t("show")}</FieldLabel>
          <CheckRow checked={o.showCode} onChange={(v) => setO({ ...o, showCode: v })}>{t("showCode")}</CheckRow>
          <CheckRow checked={o.showName} onChange={(v) => setO({ ...o, showName: v })}>{t("showName")}</CheckRow>
          <CheckRow checked={o.showRoom} onChange={(v) => setO({ ...o, showRoom: v })}>{t("showRoom")}</CheckRow>
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel>{t("layout")}</FieldLabel>
          <CheckRow checked={o.hideWeekend} onChange={(v) => setO({ ...o, hideWeekend: v })}>{t("hideWeekend")}</CheckRow>
          <CheckRow checked={o.trimHours} onChange={(v) => setO({ ...o, trimHours: v })}>
            {t("trimHours", { from: String(h0).padStart(2, "0"), to: String(h1).padStart(2, "0") })}
          </CheckRow>
          <CheckRow checked={o.clockSpace} disabled={o.size === "desktop"} onChange={(v) => setO({ ...o, clockSpace: v })}>{t("clockSpace")}</CheckRow>
        </div>
        <Button className="self-start" onClick={onSave} disabled={saving}>
          {t("saveImage")}
        </Button>
      </div>
    </div>
  );
}
