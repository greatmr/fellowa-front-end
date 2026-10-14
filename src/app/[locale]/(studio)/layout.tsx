import { setRequestLocale } from "next-intl/server";

import { Logo } from "@/components/layout/logo";
import { StudioMobileNav } from "@/components/layout/studio-mobile-nav";
import { StudioSidebar } from "@/components/layout/studio-sidebar";
import { Link } from "@/i18n/navigation";

/**
 * Creator studio frame (FE-SHELL-01; presentation Sidebar/Header @fdb5f6c).
 * Desktop: a 264px rail on the start side. Below `lg`: a top bar whose menu
 * opens the same sidebar in a drawer. No session or data is read here.
 */
export default async function StudioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-full flex-1">
      <aside className="bg-card sticky top-0 hidden h-dvh w-66 shrink-0 border-e lg:block">
        <StudioSidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-card/90 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur lg:hidden">
          <StudioMobileNav>
            <StudioSidebar />
          </StudioMobileNav>
          <Link
            href="/studio"
            className="focus-visible:ring-ring/50 rounded-md outline-none focus-visible:ring-[3px]"
          >
            <Logo />
          </Link>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
