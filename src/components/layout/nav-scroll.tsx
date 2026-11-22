'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Gap between the track and the scroll area's edges (presentation: 6px). */
const TRACK_INSET = 6
const MIN_THUMB = 20
const HIDE_AFTER_MS = 850

type Thumb = { top: number; height: number }

/**
 * The sidebar's scroll area with a floating indicator on its end edge that
 * appears only while scrolling (presentation Sidebar @ d843c3b — track and
 * thumb, no carets). It takes no layout space; the native scrollbar stays
 * hidden. Decorative: the area itself remains keyboard- and wheel-scrollable.
 */
export function NavScroll({ children }: { children: ReactNode }) {
  const area = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [thumb, setThumb] = useState<Thumb | null>(null)
  const [scrolling, setScrolling] = useState(false)

  const measure = useCallback(() => {
    const element = area.current
    if (!element) return
    const { scrollTop, scrollHeight, clientHeight } = element
    if (scrollHeight <= clientHeight + 4) {
      setThumb(null)
      return
    }
    const track = Math.max(MIN_THUMB, clientHeight - TRACK_INSET * 2)
    const height = Math.max(
      MIN_THUMB,
      Math.min(track * 0.75, (clientHeight / scrollHeight) * track)
    )
    const maxScroll = scrollHeight - clientHeight
    const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0
    setThumb({ top: TRACK_INSET + ratio * (track - height), height })
  }, [])

  useEffect(() => {
    const element = area.current
    if (!element) return
    measure()
    const timers = hideTimer
    const clearHide = () => {
      if (timers.current) clearTimeout(timers.current)
    }
    if (typeof ResizeObserver === 'undefined') return clearHide
    // Content height changes when a group opens or closes; the area's own
    // height changes with the window.
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => {
      observer.disconnect()
      clearHide()
    }
  }, [measure])

  function onScroll() {
    setScrolling(true)
    measure()
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setScrolling(false), HIDE_AFTER_MS)
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div
        ref={area}
        onScroll={onScroll}
        className="no-scrollbar h-full overflow-x-hidden overflow-y-auto"
      >
        <div>{children}</div>
      </div>
      {thumb ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 end-1 z-10 w-1 transition-opacity duration-300 ease-out',
            scrolling ? 'opacity-100' : 'opacity-0'
          )}
          aria-hidden
        >
          <div className="absolute inset-y-1.5 start-1/2 w-0.5 -translate-x-1/2 rounded-full bg-brand-500/8 rtl:translate-x-1/2 dark:bg-brand-300/10" />
          <div
            className="absolute start-1/2 w-0.75 -translate-x-1/2 rounded-full bg-brand-500/30 transition-[top,height] duration-75 rtl:translate-x-1/2 dark:bg-brand-300/35"
            style={{ top: thumb.top, height: thumb.height }}
          />
        </div>
      ) : null}
    </div>
  )
}
