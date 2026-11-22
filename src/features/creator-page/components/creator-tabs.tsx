'use client'

import {
  createContext,
  type ComponentProps,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useState,
} from 'react'

import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import {
  CREATOR_TABS_ID,
  type CreatorPageTab,
  creatorPageTabs,
} from '@/features/creator-page/lib/tabs'

type TabState = {
  tab: CreatorPageTab
  /** Open a tab; `reveal` also scrolls the tab strip into view. */
  selectTab: (tab: CreatorPageTab, reveal?: boolean) => void
}

const TabContext = createContext<TabState | null>(null)

function useCreatorTab(): TabState {
  const state = use(TabContext)
  if (!state) throw new Error('useCreatorTab outside CreatorTabsProvider')
  return state
}

/**
 * Which tab of the creator page is open, shared by the tab strip, the sticky
 * header's mini tabs, the Support / Join buttons and the posts' gate. Starts
 * from `?tab=` and keeps it in the URL (without a server round-trip), so a
 * reload or a shared link opens the same tab.
 */
export function CreatorTabsProvider({
  initialTab,
  children,
}: {
  initialTab: CreatorPageTab
  children: ReactNode
}) {
  const [tab, setTab] = useState(initialTab)

  const selectTab = useCallback((next: CreatorPageTab, reveal = false) => {
    setTab(next)
    const url = new URL(window.location.href)
    if (next === 'posts') url.searchParams.delete('tab')
    else url.searchParams.set('tab', next)
    window.history.replaceState(window.history.state, '', url)
    if (reveal) {
      const reduce = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      ).matches
      document.getElementById(CREATOR_TABS_ID)?.scrollIntoView?.({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'start',
      })
    }
  }, [])

  const value = useMemo(() => ({ tab, selectTab }), [tab, selectTab])
  return <TabContext value={value}>{children}</TabContext>
}

/** The page's tab strip and panels, controlled by the shared tab. */
export function CreatorTabs(
  props: Omit<ComponentProps<typeof Tabs>, 'value' | 'onValueChange'>
) {
  const { tab, selectTab } = useCreatorTab()
  return (
    <Tabs
      {...props}
      value={tab}
      onValueChange={(value) => {
        const next = creatorPageTabs.find((t) => t === value)
        if (next) selectTab(next)
      }}
    />
  )
}

/** A button that opens a tab and brings it into view (Join → Tiers). */
export function OpenTabButton({
  tab,
  ...props
}: Omit<ComponentProps<typeof Button>, 'onClick' | 'asChild'> & {
  tab: CreatorPageTab
}) {
  const { selectTab } = useCreatorTab()
  return (
    <Button type="button" {...props} onClick={() => selectTab(tab, true)} />
  )
}

/** The sticky header's compact tab switcher; mirrors the shared tab. */
export function MiniTabs({
  tabs,
  labels,
  className,
}: {
  /** The tabs the page shows, in order. */
  tabs: readonly CreatorPageTab[]
  labels: Record<CreatorPageTab, string>
  className?: string
}) {
  const { tab, selectTab } = useCreatorTab()
  return (
    <div className={className}>
      {tabs.map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={tab === key}
          onClick={() => selectTab(key, true)}
          className="rounded-md px-3 py-1 text-label font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs motion-reduce:transition-none"
        >
          {labels[key]}
        </button>
      ))}
    </div>
  )
}
