import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { EditPostIcon, OpenPageIcon } from '@/components/icons/app-icons'
import { Logo } from '@/components/layout/logo'
import { SidebarRailToggle } from '@/components/layout/sidebar-rail'
import { NavGroup } from '@/components/layout/nav-group'
import { NavScroll } from '@/components/layout/nav-scroll'
import { appNav, type AppNavItem } from '@/components/layout/app-nav'
import { NavLink } from '@/components/layout/nav-link'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

/**
 * Sidebar body, shared by the desktop rail and the mobile drawer
 * (presentation Sidebar @ d843c3b). Group disclosure, links, the scroll
 * indicator and the account menu are client leaves; labels and icons render
 * on the server. `account` is the signed-in account row (SidebarAccount).
 */
function NavIcon({ item }: { item: AppNavItem }) {
  const Icon = item.icon
  return (
    <Icon className="size-4.5 text-current group-aria-[current=page]:text-primary dark:group-aria-[current=page]:text-brand-300" />
  )
}

export function AppSidebar({ account }: { account?: ReactNode }) {
  const t = useTranslations('studio')

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between gap-1 px-3 group-data-[collapsed=true]/sidebar:h-auto group-data-[collapsed=true]/sidebar:flex-col group-data-[collapsed=true]/sidebar:justify-start group-data-[collapsed=true]/sidebar:gap-1.5 group-data-[collapsed=true]/sidebar:py-3">
        <Link
          href="/studio"
          title={t('label')}
          className="rounded-md px-2 py-1.5 transition-[background-color,transform] outline-none group-data-[collapsed=true]/sidebar:px-1 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95"
        >
          <Logo />
        </Link>
        <SidebarRailToggle />
      </div>

      <NavScroll>
        <nav aria-label={t('mainNav')} className="px-3 pt-1 pb-2">
          {appNav.map((section, index) => {
            const links = (
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      href={item.href}
                      exact={item.exact}
                      icon={<NavIcon item={item} />}
                      trailing={
                        item.external ? (
                          <OpenPageIcon className="size-3.5 text-ink-400 transition-colors group-hover:text-ink-700 dark:group-hover:text-white" />
                        ) : undefined
                      }
                    >
                      {t(`nav.${item.label}`)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )

            return section.group ? (
              <NavGroup
                key={section.group}
                label={t(`groups.${section.group}`)}
              >
                {links}
              </NavGroup>
            ) : (
              <div key={index} className="mb-1.5">
                {links}
              </div>
            )
          })}
        </nav>
      </NavScroll>

      <div className="shrink-0 space-y-1.5 border-t bg-card p-3">
        <Button
          asChild
          variant="inverse"
          className="group/cta create-cta w-full font-semibold group-data-[collapsed=true]/sidebar:px-0"
        >
          <Link href="/studio/posts/new" title={t('newPost')}>
            {/* Ambient sweep, and a second sweep on hover (d843c3b). */}
            <span
              className="pointer-events-none absolute inset-y-0 start-0 w-2/3 animate-cta-glint bg-linear-to-r from-transparent via-white/25 to-transparent motion-reduce:hidden dark:via-black/15"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute inset-0 -translate-x-[150%] -skew-x-20 bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover/cta:translate-x-[250%] motion-reduce:hidden dark:via-black/15"
              aria-hidden
            />
            <EditPostIcon className="cta-icon size-4.5" />
            <span className="relative transition-transform duration-300 group-hover/cta:translate-x-0.5 group-data-[collapsed=true]/sidebar:sr-only motion-reduce:transition-none">
              {t('newPost')}
            </span>
          </Link>
        </Button>
        {account}
      </div>
    </div>
  )
}
