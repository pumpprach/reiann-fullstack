"use client";

import { BookMarked, Globe, Shuffle, Sigma, Sparkles, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";
import { Tag, type PopColor } from "@/components/reiann";
import type { CreditCategory } from "@/core/types";

/** Chip colours for the status filters on the course list and graph. */
export const FILTER_POP: Record<"all" | "can-take" | "in-progress" | "blocked", PopColor> = {
  all: "pink",
  "can-take": "matcha",
  "in-progress": "sky",
  blocked: "mango",
};

/**
 * One color and icon per credit category, used everywhere a course appears.
 * Matches the timetable blocks: required = matcha, elective = purple, general = amber.
 * Icon colors keep at least 3:1 against their tile in both themes.
 */
export const CATEGORY_STYLE: Record<
  CreditCategory,
  { Icon: LucideIcon; tile: string; tag: "blue" | "matcha" | "purple" | "amber" | "strawberry"; bar: string; dot: string; pop: string; color: PopColor }
> = {
  core: { Icon: Sigma, tile: "bg-info-bg text-info", tag: "blue", bar: "bg-info", dot: "bg-info", pop: "[--pop:var(--color-pop-sky)]", color: "sky" },
  required: { Icon: BookMarked, tile: "bg-primary-soft text-primary-active", tag: "matcha", bar: "bg-primary", dot: "bg-primary", pop: "[--pop:var(--color-pop-matcha)]", color: "matcha" },
  // Light purple is too pale for an icon on its own tint, so light mode uses the text color.
  elective: { Icon: Sparkles, tile: "bg-career-bg text-text dark:text-career", tag: "purple", bar: "bg-career", dot: "bg-career", pop: "[--pop:var(--color-pop-grape)]", color: "grape" },
  general: { Icon: Globe, tile: "bg-warning-bg text-warning", tag: "amber", bar: "bg-warning", dot: "bg-warning", pop: "[--pop:var(--color-pop-mango)]", color: "mango" },
  free: { Icon: Shuffle, tile: "bg-secondary-soft text-secondary-strong", tag: "strawberry", bar: "bg-secondary-strong", dot: "bg-secondary-strong", pop: "[--pop:var(--color-pop-pink)]", color: "pink" },
};

export function CategoryTile({ category, className }: { category: CreditCategory; className?: string }) {
  const { Icon, tile } = CATEGORY_STYLE[category];
  return (
    <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-md", tile, className)} aria-hidden>
      <Icon className="size-5" />
    </span>
  );
}

export function CategoryTag({ category, className }: { category: CreditCategory; className?: string }) {
  const tc = useTranslations("common");
  return (
    <Tag tone={CATEGORY_STYLE[category].tag} dot className={className}>
      {tc(`category.${category}`)}
    </Tag>
  );
}

/** Small colored dot for filter chips and legends. */
export function CategoryDot({ category }: { category: CreditCategory }) {
  return <span className={cn("size-2.5 shrink-0 rounded-full", CATEGORY_STYLE[category].dot)} aria-hidden />;
}
