import {
  BarChart3,
  CreditCard,
  ExternalLink,
  FileText,
  Home,
  Layers,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

/**
 * Creator studio navigation (presentation Sidebar `navItems`, @fdb5f6c).
 * Only entries with a planned route are listed — see the route map in
 * ../.claude/tasks/frontend/migration-plan.md. The presentation's explore,
 * feed, chats and notifications entries are omitted until a task routes them.
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
]

export const studioSettingsItem: StudioNavItem = {
  href: '/settings',
  label: 'settings',
  icon: Settings,
}
