"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Colourful bar across the top while moving between pages. The App Router has
 * no navigation events, so it starts on a click on an internal link and finishes
 * when the pathname changes. Driven with classes on the element (no re-render).
 */
export function RouteBar() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const shown = useRef(pathname);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      const el = ref.current;
      if (!el) return;
      el.classList.remove("is-done");
      el.classList.add("is-loading");
      // If the navigation never lands (cancelled, offline), don't leave the bar up.
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => el.classList.remove("is-loading"), 10000);
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      window.clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (shown.current === pathname) return;
    shown.current = pathname;
    const el = ref.current;
    if (!el) return;
    window.clearTimeout(timer.current);
    el.classList.remove("is-loading", "is-done");
    void el.offsetWidth; // restart the animation
    el.classList.add("is-done");
  }, [pathname]);

  return <div ref={ref} className="route-bar" onAnimationEnd={(e) => e.animationName === "route-done" && e.currentTarget.classList.remove("is-done")} aria-hidden />;
}
