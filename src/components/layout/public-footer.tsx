import { useTranslations } from "next-intl";

import { ThemeSwitch } from "@/components/common/theme-switch";
import { Logo } from "@/components/layout/logo";
import { Link } from "@/i18n/navigation";

export function PublicFooter() {
  const t = useTranslations("publicLayout");

  return (
    <footer className="bg-card border-t">
      <div className="max-w-public mx-auto flex flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-3">
          <Link
            href="/"
            aria-label={t("home")}
            className="focus-visible:outline-ring inline-flex rounded-md focus-visible:outline-2"
          >
            <Logo />
          </Link>
          <p className="text-muted-foreground text-body leading-7">
            {t("tagline")}
          </p>
          <p className="text-muted-foreground text-label">{t("copyright")}</p>
        </div>
        <nav
          aria-label={t("footerNav")}
          className="text-body flex flex-wrap gap-5 font-semibold"
        >
          <Link
            href="/#why"
            className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-sm focus-visible:outline-2"
          >
            {t("why")}
          </Link>
          <Link
            href="/#features"
            className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-sm focus-visible:outline-2"
          >
            {t("features")}
          </Link>
          <Link
            href="/studio"
            className="text-link focus-visible:outline-ring rounded-sm focus-visible:outline-2"
          >
            {t("studio")}
          </Link>
        </nav>
        <ThemeSwitch className="w-full max-w-64 shrink-0" />
      </div>
    </footer>
  );
}
