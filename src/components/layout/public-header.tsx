import { useTranslations } from "next-intl";

import { Logo } from "@/components/layout/logo";
import { PublicMobileNav } from "@/components/layout/public-mobile-nav";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function PublicHeader() {
  const t = useTranslations("publicLayout");

  return (
    <header className="bg-background/90 sticky top-0 z-30 border-b backdrop-blur-xl">
      <div className="max-w-public mx-auto flex h-18 items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label={t("home")}
          className="focus-visible:ring-ring/50 shrink-0 rounded-md outline-none focus-visible:ring-2"
        >
          <Logo />
        </Link>
        <nav
          aria-label={t("mainNav")}
          className="hidden items-center gap-6 md:flex"
        >
          <Link
            href="/#why"
            className="text-muted-foreground hover:text-foreground text-body focus-visible:outline-ring rounded-sm font-semibold focus-visible:outline-2"
          >
            {t("why")}
          </Link>
          <Link
            href="/#features"
            className="text-muted-foreground hover:text-foreground text-body focus-visible:outline-ring rounded-sm font-semibold focus-visible:outline-2"
          >
            {t("features")}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="rounded-full">
            <Link href="/studio">{t("studio")}</Link>
          </Button>
          <PublicMobileNav />
        </div>
      </div>
    </header>
  );
}
