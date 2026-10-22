import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Logo } from "@/components/layout/logo";
import { SkipLink } from "@/components/layout/skip-link";
import { StudioDesktopRail } from "@/components/layout/studio-desktop-rail";
import { StudioMobileNav } from "@/components/layout/studio-mobile-nav";
import { StudioSidebar } from "@/components/layout/studio-sidebar";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Session-independent creator frame. Product data and authorization belong to features. */
export function AppLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("studio");

  return (
    <div className="flex min-h-full flex-1">
      <SkipLink />
      <StudioDesktopRail>
        <StudioSidebar />
      </StudioDesktopRail>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-card/90 sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <StudioMobileNav>
              <StudioSidebar />
            </StudioMobileNav>
            <Link
              href="/studio"
              className="focus-visible:ring-ring/50 rounded-md outline-none focus-visible:ring-2 lg:hidden"
            >
              <Logo />
            </Link>
            <span className="text-muted-foreground text-body hidden font-semibold lg:block">
              {t("label")}
            </span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              {t("visitHome")}
              <ArrowUpRightIcon className="size-4 rtl:-rotate-90" aria-hidden />
            </Link>
          </Button>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="max-w-content mx-auto w-full flex-1 px-4 py-6 outline-none sm:px-6 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
