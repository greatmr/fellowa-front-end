'use client'

import { type ReactNode, useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * The sticky scroll header (presentation `CreatorProfileView` :414-535 @
 * d843c3b): a mini identity, the tabs and the actions, shown once the
 * element `watchId` (the cover and identity) has scrolled out of view above
 * the viewport. It slides in, or simply appears under reduced motion. While
 * hidden it is `inert`, so neither focus nor assistive technology reaches a
 * copy of controls that are on screen anyway.
 */
export function CreatorStickyHeader({
  watchId,
  identity,
  tabs,
  actions,
}: {
  watchId: string
  identity: ReactNode
  tabs: ReactNode
  actions: ReactNode
}) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const target = document.getElementById(watchId)
    if (!target || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return
      setShown(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0)
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [watchId])

  return (
    <div
      data-state={shown ? 'shown' : 'hidden'}
      inert={!shown}
      aria-hidden={!shown}
      className={cn(
        'fixed inset-x-0 top-0 z-40 border-b bg-background/95 backdrop-blur-xl motion-safe:transition-[translate,opacity] motion-safe:duration-300',
        shown
          ? 'translate-y-0 opacity-100 shadow-md'
          : 'pointer-events-none -translate-y-full opacity-0'
      )}
    >
      <div className="mx-auto flex max-w-public items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {identity}
        {tabs}
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
    </div>
  )
}
