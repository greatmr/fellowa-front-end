import { PlusIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { ThemeSwitch } from '@/components/common/theme-switch'
import { Logo } from '@/components/layout/logo'
import { StudioNavGroup } from '@/components/layout/studio-nav-group'
import {
  studioNav,
  studioSettingsItem,
  type StudioNavItem,
} from '@/components/layout/studio-nav'
import { StudioNavLink } from '@/components/layout/studio-nav-link'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

/**
 * Sidebar body, shared by the desktop rail and the mobile drawer. Group
 * disclosure and links are client leaves; labels and icons render on the server.
 */
function NavIcon({ item }: { item: StudioNavItem }) {
  const Icon = item.icon
  return (
    <Icon
      className="size-4.5 shrink-0 text-ink-400 group-aria-[current=page]:text-primary dark:group-aria-[current=page]:text-brand-300"
      strokeWidth={1.8}
      aria-hidden
    />
  )
}

export function StudioSidebar() {
  const t = useTranslations('studio')

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-5 group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0">
        <Link
          href="/studio"
          title={t('label')}
          className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
      </div>

      <nav
        aria-label={t('mainNav')}
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
          )

          return section.group ? (
            <StudioNavGroup
              key={section.group}
              label={t(`groups.${section.group}`)}
            >
              {links}
            </StudioNavGroup>
          ) : (
            <div key={index} className="mb-2.5">
              {links}
            </div>
          )
        })}
      </nav>

      <div className="shrink-0 space-y-3 border-t bg-card p-3">
        <Button
          asChild
          className="w-full group-data-[collapsed=true]/sidebar:px-0"
        >
          <Link href="/studio/posts/new" title={t('newPost')}>
            <PlusIcon strokeWidth={2.2} aria-hidden />
            <span className="group-data-[collapsed=true]/sidebar:sr-only">
              {t('newPost')}
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
  )
}
