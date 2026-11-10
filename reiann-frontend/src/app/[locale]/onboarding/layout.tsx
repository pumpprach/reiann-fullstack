import { Brand } from "@/components/app/brand";
import { Gate } from "@/components/app/gate";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Gate need="user">
      <div className="min-h-dvh px-4 py-5 md:px-14 md:py-10">
        <Brand />
        <div className="mx-auto mt-6 max-w-[1240px] md:mt-10">{children}</div>
      </div>
    </Gate>
  );
}
