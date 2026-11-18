'use client'

import { useLinkStatus } from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * A step link's content while the step it opens is loading: the link stays
 * where it is and pulses (no spinner to make room for), and the current step
 * stays on screen until the next one renders. Must sit inside a `Link`.
 */
export function LinkPending({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { pending } = useLinkStatus()
  return (
    <span
      data-pending={pending || undefined}
      className={cn(
        pending && 'animate-pulse motion-reduce:animate-none',
        className
      )}
    >
      {children}
    </span>
  )
}
