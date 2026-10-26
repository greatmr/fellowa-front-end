import {
  BarChart3,
  Bell,
  Compass,
  CreditCard,
  ExternalLink,
  FileText,
  Home,
  Layers,
  LayoutGrid,
  MessageSquare,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

/**
 * Creator studio navigation (presentation Sidebar `navItems`, @fdb5f6c).
 * Every item in the presentation's main navigation has a route. Sections
 * without a product screen render an honest placeholder until their feature is built.
 * Labels are keys under `studio.nav`.
 */
export type StudioNavItem = {
  href: string
  label: string
  icon: LucideIcon
  /** Active only on an exact match (the studio root). */
  exact?: boolean
}

export type StudioNavGroup = {
  /** Key under `studio.groups`; omitted for the ungrouped first block. */
  group?: string
  items: StudioNavItem[]
}

export const studioNav: StudioNavGroup[] = [
  {
    items: [
      { href: '/studio', label: 'dashboard', icon: Home, exact: true },
      { href: '/studio/page', label: 'page', icon: ExternalLink },
    ],
  },
  {
    group: 'monetization',
    items: [
      { href: '/studio/audience', label: 'audience', icon: Users },
      { href: '/studio/tiers', label: 'tiers', icon: Layers },
      { href: '/studio/posts', label: 'posts', icon: FileText },
      { href: '/studio/payouts', label: 'payouts', icon: BarChart3 },
      { href: '/memberships', label: 'payments', icon: CreditCard },
    ],
  },
  {
    group: 'discover',
    items: [
      { href: '/explore', label: 'explore', icon: Compass },
      { href: '/feed', label: 'feed', icon: LayoutGrid },
      { href: '/chats', label: 'chats', icon: MessageSquare },
      { href: '/notifications', label: 'notifications', icon: Bell },
    ],
  },
]

export const studioSettingsItem: StudioNavItem = {
  href: '/settings',
  label: 'settings',
  icon: Settings,
}
