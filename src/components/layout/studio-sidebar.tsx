import { ChevronDownIcon, PlusIcon } from "lucide-react";
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
 * Account and recent-visit controls await the session contract (C-4).
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
      <div className="flex h-16 shrink-0 items-center px-5 group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0">
        <Link
          href="/studio"
          title={t("label")}
          className="focus-visible:ring-ring/50 rounded-md outline-none focus-visible:ring-[3px]"
        >
          <Logo />
        </Link>
      </div>

      <nav
        aria-label={t("mainNav")}
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-2"
      >
        {studioNav.map((section, index) => {
          const links = (
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
          );

          return section.group ? (
            <details
              key={section.group}
              open
              className="group/nav-section mb-2.5"
            >
              <summary className="text-muted-foreground focus-visible:ring-ring/50 text-label flex cursor-pointer list-none items-center justify-between gap-1 rounded-md px-3 py-2 font-semibold outline-none group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0 focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
                <span className="group-data-[collapsed=true]/sidebar:sr-only">
                  {t(`groups.${section.group}`)}
                </span>
                <ChevronDownIcon
                  className="size-3.5 shrink-0 transition-transform group-open/nav-section:rotate-180 motion-reduce:transition-none"
                  aria-hidden
                />
              </summary>
              {links}
            </details>
          ) : (
            <div key={index} className="mb-2.5">
              {links}
            </div>
          );
        })}
      </nav>

      <div className="bg-card shrink-0 space-y-3 border-t p-3">
        <Button
          asChild
          className="w-full group-data-[collapsed=true]/sidebar:px-0"
        >
          <Link href="/studio/posts/new" title={t("newPost")}>
            <PlusIcon strokeWidth={2.2} aria-hidden />
            <span className="group-data-[collapsed=true]/sidebar:sr-only">
              {t("newPost")}
            </span>
          </Link>
        </Button>
        <StudioNavLink
          href={studioSettingsItem.href}
          icon={<NavIcon item={studioSettingsItem} />}
        >
          {t(`nav.${studioSettingsItem.label}`)}
        </StudioNavLink>
        <ThemeSwitch className="px-1 group-data-[collapsed=true]/sidebar:hidden" />
      </div>
    </div>
  );
}
