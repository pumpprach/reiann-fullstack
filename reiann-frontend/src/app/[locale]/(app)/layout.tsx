import { Gate } from "@/components/app/gate";
import { AppShell } from "@/components/app/shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Gate need="onboarded">
      <AppShell>{children}</AppShell>
    </Gate>
  );
}
