import type { ComponentType } from 'react'

import {
  AudienceIcon,
  ChatIcon,
  DashboardIcon,
  ExploreIcon,
  FeedIcon,
  NotificationIcon,
  PlansIcon,
  PostsIcon,
  ProfileMeIcon,
  ReportsIcon,
  WalletIcon,
} from '@/components/icons/app-icons'

import type { PanelPage } from '@/components/layout/page-placeholder'

/**
 * Creator navigation (presentation Sidebar `navItems`, @fdb5f6c;
 * labels re-ported @d843c3b).
 * Every item in the presentation's main navigation has a route. Sections
 * without a product screen render an honest placeholder until their feature is built.
 * Labels are keys under `panel.nav`.
 */
export type AppNavItem = {
  /**
   * The route; `null` for the creator's own public page (`/creators/:id`),
   * whose address the shell passes in from the session.
   */
  href: string | null
  label: string
  icon: ComponentType<{ className?: string }>
  /** Active only on an exact match (the dashboard). */
  exact?: boolean
  /** Shows a trailing "opens your public page" arrow (presentation `afterIcon`). */
  external?: boolean
}

export type AppNavSection = {
  /** Key under `panel.groups`; omitted for the ungrouped first block. */
  group?: string
  items: AppNavItem[]
}

export const appNav: AppNavSection[] = [
  {
    items: [
      {
        href: '/dashboard',
        label: 'dashboard',
        icon: DashboardIcon,
        exact: true,
      },
      {
        href: null,
        label: 'page',
        icon: ProfileMeIcon,
        external: true,
      },
    ],
  },
  {
    group: 'monetization',
    items: [
      { href: '/audience', label: 'audience', icon: AudienceIcon },
      { href: '/tiers', label: 'tiers', icon: PlansIcon },
      { href: '/posts', label: 'posts', icon: PostsIcon },
      { href: '/payouts', label: 'payouts', icon: ReportsIcon },
      { href: '/memberships', label: 'payments', icon: WalletIcon },
    ],
  },
  {
    group: 'discover',
    items: [
      { href: '/explore', label: 'explore', icon: ExploreIcon },
      { href: '/feed', label: 'feed', icon: FeedIcon },
      { href: '/chats', label: 'chats', icon: ChatIcon },
      {
        href: '/notifications',
        label: 'notifications',
        icon: NotificationIcon,
      },
    ],
  },
]

/**
 * Which panel page a pathname shows, for the header's category / title
 * (presentation Header `VIEW_TITLES`). Most specific first; `null` outside
 * the panel's known routes.
 */
const panelPages: Array<{ href: string; page: PanelPage; exact?: boolean }> = [
  { href: '/dashboard', page: 'dashboard', exact: true },
  { href: '/posts/new', page: 'composer' },
  { href: '/posts', page: 'posts' },
  { href: '/tiers', page: 'tiers' },
  { href: '/audience', page: 'audience' },
  { href: '/payouts', page: 'payouts' },
  { href: '/memberships', page: 'payments' },
  { href: '/settings', page: 'settings' },
  { href: '/explore', page: 'explore' },
  { href: '/feed', page: 'feed' },
  { href: '/chats', page: 'chats' },
  { href: '/notifications', page: 'notifications' },
]

export function isPathActive(href: string, pathname: string, exact = false) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function panelPageForPath(pathname: string): PanelPage | null {
  const match = panelPages.find(({ href, exact }) =>
    isPathActive(href, pathname, exact)
  )
  return match?.page ?? null
}
