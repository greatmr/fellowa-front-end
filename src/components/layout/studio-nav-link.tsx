'use client'

import { useSyncExternalStore, type ReactNode } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const noopSubscribe = () => () => {}

export function isPathActive(href: string, pathname: string, exact = false) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * The only pathname-dependent piece of the shell. With the next-intl proxy
 * rewriting prefix-less `fa` URLs, the server's pathname can differ from the
 * browser's, so the active state is applied after hydration (Next 16 docs:
 * usePathname → "Avoid hydration mismatch with rewrites").
 *
 * `icon` is a rendered element (a component cannot cross the server→client
 * boundary); it reacts to the active state through `group-aria-[current=page]:`.
 */
export function StudioNavLink({
  href,
  exact = false,
  icon,
  children,
}: {
  href: string
  exact?: boolean
  icon: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
  const active = hydrated && isPathActive(href, pathname, exact)

  return (
    <Link
      href={href}
      title={typeof children === 'string' ? children : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-body font-medium transition-colors outline-none group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0 focus-visible:ring-[3px] focus-visible:ring-ring/50',
        active
          ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
          : 'text-ink-700 hover:bg-accent hover:text-foreground dark:text-ink-200'
      )}
    >
      {icon}
      <span className="flex-1 truncate group-data-[collapsed=true]/sidebar:sr-only">
        {children}
      </span>
    </Link>
  )
}
