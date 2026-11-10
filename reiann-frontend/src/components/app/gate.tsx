"use client";

import { useEffect } from "react";
import { useProfile, useUser } from "@/data/hooks";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Skeleton } from "@/components/reiann";

type Need = "user" | "profile" | "onboarded";

/**
 * Client-side route guard (frontend-flows.md §2). With a real backend the
 * first check moves to proxy.ts; the rest stay here.
 *  1. not signed in → /sign-in?next=…
 *  2. no program → /onboarding/program
 *  3. transcript step not done → /onboarding/transcript
 */
export function Gate({ need, children }: { need: Need; children: React.ReactNode }) {
  const user = useUser();
  const profile = useProfile();
  const router = useRouter();
  const pathname = usePathname();

  const loading = user.isPending || profile.isPending;
  let redirect: string | null = null;
  if (!loading) {
    if (!user.data) redirect = `/sign-in?next=${encodeURIComponent(pathname)}`;
    else if (need !== "user" && !profile.data) redirect = "/onboarding/program";
    else if (need === "onboarded" && profile.data?.transcript === "pending")
      redirect = "/onboarding/transcript";
  }

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  if (loading || redirect) {
    return (
      <div className="flex min-h-dvh gap-8 p-4 md:p-8" aria-busy>
        <Skeleton className="hidden h-[calc(100dvh-4rem)] w-60 lg:block" />
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
