"use client";

import { usePathname } from "@/i18n/navigation";
import { RouteBar } from "./route-bar";
import { MobileTopBar, Sidebar } from "./sidebar";

/** App frame: sidebar on desktop (≥1024px), top bar + drawer on phones and tablets. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-dvh">
      <RouteBar />
      <Sidebar />
      <main className="min-w-0 flex-1">
        <MobileTopBar />
        {/* Re-keyed per page so each page rises in softly. */}
        <div key={pathname} className="mx-auto max-w-[1180px] animate-rise-in px-4 pt-5 pb-10 md:px-8 md:pt-8 md:pb-12">
          {children}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        {eyebrow && <p className="type-small text-text-secondary">{eyebrow}</p>}
        <h1 className="type-h2 text-text md:type-h1">{title}</h1>
        {subtitle && <div className="mt-1 type-body text-text-secondary">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
