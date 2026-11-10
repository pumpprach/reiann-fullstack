import { useTranslations } from "next-intl";
import { Brand } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <div className="flex min-h-dvh flex-col px-6 py-6 md:px-14 md:py-10">
      <Brand />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="type-display text-text-muted">404</p>
        <h1 className="type-h2 text-text">{t("title")}</h1>
        <p className="type-body text-text-secondary">{t("body")}</p>
        <Button asChild>
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    </div>
  );
}
