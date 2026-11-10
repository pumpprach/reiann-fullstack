"use client";

import {
  BookOpen,
  Menu,
  Calculator,
  CalendarClock,
  ClipboardList,
  FileText,
  Home,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Sun,
  Users,
  Waypoints,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useLayoutEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/data/hooks";
import { Link, usePathname } from "@/i18n/navigation";
import { CS_PROGRAM, FACULTIES, PROGRAM_OPTIONS } from "@/mocks/programs";
import { Brand } from "./brand";

type NavKey =
  | "home"
  | "search"
  | "courses"
  | "calculator"
  | "schedule"
  | "exams"
  | "groups"
  | "sheets"
  | "qa"
  | "books";

const MAIN: { key: NavKey; href: string; Icon: typeof Home; tile: string; nav: string }[] = [
  { key: "home", href: "/", Icon: Home, tile: "bg-primary-soft text-primary-active", nav: "matcha" },
  { key: "search", href: "/search", Icon: Search, tile: "bg-secondary-soft text-secondary-strong", nav: "pink" },
  { key: "courses", href: "/courses", Icon: Waypoints, tile: "bg-info-bg text-info", nav: "sky" },
  { key: "calculator", href: "/calculator", Icon: Calculator, tile: "bg-warning-bg text-warning", nav: "mango" },
  { key: "schedule", href: "/schedule", Icon: CalendarClock, tile: "bg-primary-soft text-primary-active", nav: "matcha" },
  { key: "exams", href: "/soon/exams", Icon: ClipboardList, tile: "bg-error-bg text-error", nav: "pink" },
  { key: "groups", href: "/soon/groups", Icon: Users, tile: "bg-info-bg text-info", nav: "sky" },
];

const COMMUNITY: { key: NavKey; href: string; Icon: typeof Home; nav: string }[] = [
  { key: "sheets", href: "/soon/sheets", Icon: FileText, nav: "mango" },
  { key: "qa", href: "/soon/qa", Icon: MessageSquare, nav: "sky" },
  { key: "books", href: "/soon/books", Icon: BookOpen, nav: "grape" },
];

const navColor = (nav: string) => ({ "--nav": `var(--color-pop-${nav})` }) as React.CSSProperties;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

/** Nav, theme toggle and program card. Shared by the desktop sidebar and the phone/tablet drawer. */
function SidebarContent() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const profile = useProfile().data;

  const option = PROGRAM_OPTIONS.find((p) => p.id === profile?.programId);
  const faculty = FACULTIES.find((f) => f.id === option?.facultyId);
  const isDark = resolvedTheme === "dark";

  // Move the marker to the selected item (measured, so it can't go through state).
  const navRef = useRef<HTMLElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const mark = markRef.current;
    const active = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!mark) return;
    if (!active) {
      mark.style.opacity = "0";
      return;
    }
    mark.style.height = `${active.offsetHeight - 16}px`;
    mark.style.transform = `translateY(${active.offsetTop + 8}px)`;
    mark.style.setProperty("--nav", active.style.getPropertyValue("--nav"));
    mark.style.opacity = "1";
    // Only animate moves, not the first placement.
    requestAnimationFrame(() => (mark.dataset.ready = ""));
  }, [pathname]);

  const item = (active: boolean) =>
    cn(
      "nav-item group press flex h-11 shrink-0 items-center gap-3 rounded-md px-2 type-small-medium text-text outline-none focus-visible:ring-3 focus-visible:ring-focus/30 [--nav:var(--color-pop-pink)]",
      active && "font-semibold",
    );

  return (
    <>
      <nav ref={navRef} aria-label={t("label")} className="relative flex flex-1 flex-col gap-1 overflow-y-auto">
          <span ref={markRef} className="nav-indicator" aria-hidden />
        {MAIN.map(({ key, href, Icon, tile, nav }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={key} href={href} className={item(active)} style={navColor(nav)} aria-current={active ? "page" : undefined}>
              <span className={cn("nav-tile inline-flex size-7 items-center justify-center rounded-sm group-hover:animate-wiggle", active && "animate-jelly", tile)}>
                <Icon className="size-4" aria-hidden />
              </span>
              {t(key)}
            </Link>
          );
        })}
        <p className="mt-4 mb-1 px-2 type-eyebrow text-text-secondary">{t("fromStudents")}</p>
        {COMMUNITY.map(({ key, href, Icon, nav }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={key} href={href} className={item(active)} style={navColor(nav)} aria-current={active ? "page" : undefined}>
              <span className="nav-tile inline-flex size-7 items-center justify-center rounded-sm bg-surface-alt text-text-secondary group-hover:animate-wiggle">
                <Icon className="size-4" aria-hidden />
              </span>
              {t(key)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(item(false), "flex-1")}
          >
            <span className="inline-flex size-7 items-center justify-center rounded-sm bg-surface-alt transition-transform duration-(--duration-slow) ease-(--ease-bounce) group-hover:rotate-45">
              {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
            </span>
            {isDark ? t("lightMode") : t("darkMode")}
          </button>
          <Link
            href="/settings"
            aria-label={t("settings")}
            className={cn(item(isActive(pathname, "/settings")), "w-11 justify-center px-0")}
          >
            <Settings className="size-5" aria-hidden />
          </Link>
        </div>
        {profile && option && (
          <div className="flex items-center gap-3 rounded-md bg-surface-alt p-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm bg-surface type-badge text-text">
              {tc("year", { year: profile.year })}
            </span>
            <div className="min-w-0">
              <p className="truncate type-small-medium text-text">{option.nameEn}</p>
              <p className="truncate type-caption text-text-secondary">{faculty?.nameEn ?? CS_PROGRAM.facultyEn}</p>
              <p className="truncate type-caption text-text-secondary">
                {t("termStatus", { term: tc("term", { sem: "1", year: 2569 }) })}
              </p>
            </div>
          </div>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href="/onboarding/program?from=settings">{t("changeProgram")}</Link>
        </Button>
      </div>
    </>
  );
}

/** Desktop (≥1024px): fixed sidebar. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col border-r border-border bg-surface px-4 py-5 lg:flex">
      <Link href="/" className="mb-6 px-1">
        <Brand />
      </Link>
      <SidebarContent />
    </aside>
  );
}

/** Phone and tablet (<1024px): top bar with a menu button that opens the sidebar as a drawer. */
export function MobileTopBar() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  // Remember which page the drawer was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);

  return (
    <DialogPrimitive.Root open={openOn === pathname} onOpenChange={(o) => setOpenOn(o ? pathname : null)}>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Link href="/" aria-label="Reiann">
          <Brand />
        </Link>
        <DialogPrimitive.Trigger asChild>
          <Button variant="outline" size="icon" aria-label={t("openMenu")}>
            <Menu />
          </Button>
        </DialogPrimitive.Trigger>
      </header>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(300px,86vw)] flex-col bg-surface px-4 py-5 shadow-lg outline-none data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left">
          <div className="mb-6 flex items-center justify-between px-1">
            <Brand />
            <DialogPrimitive.Close asChild>
              <Button variant="outline" size="sm">
                {tc("close")}
              </Button>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Title className="sr-only">{t("label")}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{t("label")}</DialogPrimitive.Description>
          <SidebarContent />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
