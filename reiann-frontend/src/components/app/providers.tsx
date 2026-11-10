"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isSupabaseConfigured, supabase } from "@/data/supabase-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } },
      }),
  );
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let previousUser: string | undefined;
    const { data: { subscription } } = supabase().auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user.id;
      if (previousUser !== currentUser) {
        if (previousUser !== undefined) client.clear();
        previousUser = currentUser;
      }
    });
    return () => subscription.unsubscribe();
  }, [client]);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster position="bottom-center" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
