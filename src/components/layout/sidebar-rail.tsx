'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

type RailState = { collapsed: boolean; toggle?: () => void }

const SidebarRailContext = createContext<RailState>({ collapsed: false })

export function useSidebarRailCollapsed() {
  return useContext(SidebarRailContext).collapsed
}

const railBodyId = 'desktop-panel-navigation'

/** Only the desktop rail's disclosure is client-owned; its body stays server-rendered. */
export function SidebarRail({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        'group/sidebar sticky top-0 hidden h-dvh shrink-0 border-e bg-card transition-[width] duration-300 ease-out motion-reduce:transition-none lg:block',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}
    >
      <SidebarRailContext.Provider
        value={{ collapsed, toggle: () => setCollapsed((value) => !value) }}
      >
        <div id={railBodyId} className="h-full">
          {children}
        </div>
      </SidebarRailContext.Provider>
    </aside>
  )
}

/**
 * Collapse / expand control beside the logo (presentation Sidebar
 * `PanelRightClose` / `PanelRightOpen`, d843c3b). Renders only inside the
 * desktop rail; the mobile drawer has no icon mode.
 */
export function SidebarRailToggle() {
  const t = useTranslations('panel')
  const { collapsed, toggle } = useContext(SidebarRailContext)
  if (!toggle) return null
  const Icon = collapsed ? PanelLeftOpenIcon : PanelLeftCloseIcon
  const label = t(collapsed ? 'expandSidebar' : 'collapseSidebar')

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-expanded={!collapsed}
      aria-controls={railBodyId}
      onClick={toggle}
      className="flex size-8 items-center justify-center rounded-md text-ink-400 transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Icon className="size-4 rtl:rotate-180" aria-hidden />
    </button>
  )
}
