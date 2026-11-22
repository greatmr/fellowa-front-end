'use client'

import { useSyncExternalStore, type ReactNode } from 'react'

import { isPathActive } from '@/components/layout/app-nav'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export { isPathActive }

const noopSubscribe = () => () => {}

/**
 * The only pathname-dependent piece of the shell. With the next-intl proxy
 * rewriting prefix-less `fa` URLs, the server's pathname can differ from the
 * browser's, so the active state is applied after hydration (Next 16 docs:
 * usePathname → "Avoid hydration mismatch with rewrites").
 *
 * `icon` and `trailing` are rendered elements (a component cannot cross the
 * server→client boundary); they react to the active state through
 * `group-aria-[current=page]:`. The current item carries a bar on its start
 * edge (presentation Sidebar @ d843c3b), sitting on the rail's padding.
 */
export function NavLink({
  href,
  exact = false,
  icon,
  trailing,
  children,
}: {
  href: string
  exact?: boolean
  icon: ReactNode
  trailing?: ReactNode
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
        'group relative flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-body font-medium transition-[color,background-color,box-shadow,transform] duration-150 outline-none group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0 focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98]',
        active
          ? 'bg-brand-50 font-semibold text-brand-700 shadow-xs dark:bg-brand-500/15 dark:text-brand-200'
          : 'text-ink-700 hover:bg-accent hover:text-foreground dark:text-ink-100/85 dark:hover:text-white'
      )}
    >
      <span className="shrink-0 transition-transform duration-150 group-hover:scale-105">
        {icon}
      </span>
      <span className="max-w-48 flex-1 truncate transition-[max-width,opacity] duration-300 group-data-[collapsed=true]/sidebar:max-w-0 group-data-[collapsed=true]/sidebar:flex-none group-data-[collapsed=true]/sidebar:opacity-0 motion-reduce:transition-none">
        {children}
      </span>
      {trailing ? (
        <span className="shrink-0 group-data-[collapsed=true]/sidebar:hidden">
          {trailing}
        </span>
      ) : null}
      {active ? (
        <span
          className="absolute -start-3 top-1/2 h-5 w-1 -translate-y-1/2 animate-in rounded-e-full bg-brand-600 duration-200 zoom-in-75 fade-in dark:bg-brand-400"
          aria-hidden
        />
      ) : null}
    </Link>
  )
}
