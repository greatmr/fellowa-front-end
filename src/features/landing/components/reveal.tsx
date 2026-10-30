'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Fades content in the first time it scrolls into view. The server markup is
 * visible: only an element still below the fold is hidden, and only once this
 * effect runs, so nothing depends on JavaScript and nothing flashes. Skipped
 * entirely under prefers-reduced-motion.
 */
export function Reveal({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (element.getBoundingClientRect().top < window.innerHeight) return

    element.dataset.reveal = 'hidden'
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        element.dataset.reveal = 'shown'
        observer.disconnect()
      },
      { threshold: 0.12 }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        'data-[reveal=hidden]:translate-y-8 data-[reveal=hidden]:opacity-0 data-[reveal=shown]:transition data-[reveal=shown]:duration-700 data-[reveal=shown]:ease-out',
        className
      )}
    >
      {children}
    </div>
  )
}
