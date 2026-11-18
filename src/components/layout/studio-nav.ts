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

import type { StudioPage } from '@/components/layout/studio-placeholder'

/**
 * Creator studio navigation (presentation Sidebar `navItems`, @fdb5f6c;
 * labels re-ported @d843c3b).
 * Every item in the presentation's main navigation has a route. Sections
 * without a product screen render an honest placeholder until their feature is built.
 * Labels are keys under `studio.nav`.
 */
export type StudioNavItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** Active only on an exact match (the studio root). */
  exact?: boolean
  /** Shows a trailing "opens your public page" arrow (presentation `afterIcon`). */
  external?: boolean
}

export type StudioNavGroup = {
  /** Key under `studio.groups`; omitted for the ungrouped first block. */
  group?: string
  items: StudioNavItem[]
}

export const studioNav: StudioNavGroup[] = [
  {
    items: [
      { href: '/studio', label: 'dashboard', icon: DashboardIcon, exact: true },
      {
        href: '/studio/page',
        label: 'page',
        icon: ProfileMeIcon,
        external: true,
      },
    ],
  },
  {
    group: 'monetization',
    items: [
      { href: '/studio/audience', label: 'audience', icon: AudienceIcon },
      { href: '/studio/tiers', label: 'tiers', icon: PlansIcon },
      { href: '/studio/posts', label: 'posts', icon: PostsIcon },
      { href: '/studio/payouts', label: 'payouts', icon: ReportsIcon },
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
 * Which studio page a pathname shows, for the header's category / title
 * (presentation Header `VIEW_TITLES`). Most specific first; `null` outside
 * the studio's known routes.
 */
const studioPages: Array<{ href: string; page: StudioPage; exact?: boolean }> =
  [
    { href: '/studio', page: 'dashboard', exact: true },
    { href: '/studio/posts/new', page: 'composer' },
    { href: '/studio/posts', page: 'posts' },
    { href: '/studio/page', page: 'page' },
    { href: '/studio/tiers', page: 'tiers' },
    { href: '/studio/audience', page: 'audience' },
    { href: '/studio/payouts', page: 'payouts' },
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

export function studioPageForPath(pathname: string): StudioPage | null {
  const match = studioPages.find(({ href, exact }) =>
    isPathActive(href, pathname, exact)
  )
  return match?.page ?? null
}
