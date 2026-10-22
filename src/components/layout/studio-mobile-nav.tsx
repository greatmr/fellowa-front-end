"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { NavigationDrawer } from "@/components/layout/navigation-drawer";
import { usePathname } from "@/i18n/navigation";

/**
 * Below `lg` the sidebar lives in a drawer on the start side (the side the
 * desktop rail occupies). `children` is the server-rendered sidebar body.
 * Any link click inside closes the drawer.
 */
export function StudioMobileNav({ children }: { children: ReactNode }) {
  const t = useTranslations("studio");
  const tCommon = useTranslations("common");
  const pathname = usePathname();

  return (
    <NavigationDrawer
      key={pathname}
      title={t("mainNav")}
      openLabel={t("openMenu")}
      closeLabel={tCommon("close")}
      desktopQuery="(min-width: 64rem)"
      triggerClassName="lg:hidden"
    >
      {children}
    </NavigationDrawer>
  );
}
