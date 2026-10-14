import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ThemeSwitch } from "@/components/common/theme-switch";
import { Logo } from "@/components/layout/logo";
import {
  studioNav,
  studioSettingsItem,
  type StudioNavItem,
} from "@/components/layout/studio-nav";
import { StudioNavLink } from "@/components/layout/studio-nav-link";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * Sidebar body, shared by the desktop rail and the mobile drawer. A server
 * component; only the links and the theme switch are client leaves.
 * Not ported from the presentation (FE-SHELL-01): the collapsed icon rail,
 * collapsible groups, recent visits and the account menu — the last two
 * need a session (C-4).
 */
function NavIcon({ item }: { item: StudioNavItem }) {
  const Icon = item.icon;
  return (
    <Icon
      className="text-ink-400 group-aria-[current=page]:text-primary dark:group-aria-[current=page]:text-brand-300 size-4.5 shrink-0"
      strokeWidth={1.8}
      aria-hidden
    />
  );
}

export function StudioSidebar() {
  const t = useTranslations("studio");

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link
          href="/studio"
          className="focus-visible:ring-ring/50 rounded-md outline-none focus-visible:ring-[3px]"
        >
          <Logo />
        </Link>
      </div>

      <nav
        aria-label={t("mainNav")}
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-2"
      >
        {studioNav.map((section, index) => (
          <div key={section.group ?? index} className="mb-2.5">
            {section.group ? (
              <p className="text-muted-foreground text-label px-3 py-1.5 font-semibold">
                {t(`groups.${section.group}`)}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <StudioNavLink
                    href={item.href}
                    exact={item.exact}
                    icon={<NavIcon item={item} />}
                  >
                    {t(`nav.${item.label}`)}
                  </StudioNavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="bg-card shrink-0 space-y-3 border-t p-3">
        <Button asChild className="w-full">
          <Link href="/studio/posts/new">
            <PlusIcon strokeWidth={2.2} aria-hidden />
            {t("newPost")}
          </Link>
        </Button>
        <StudioNavLink
          href={studioSettingsItem.href}
          icon={<NavIcon item={studioSettingsItem} />}
        >
          {t(`nav.${studioSettingsItem.label}`)}
        </StudioNavLink>
        <ThemeSwitch className="px-1" />
      </div>
    </div>
  );
}
