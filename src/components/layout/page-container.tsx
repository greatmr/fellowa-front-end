import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/*
 * Each width is a `maxWidth` token in tailwind.config.ts, one per
 * presentation view @ d843c3b (the prototype's `<main>` has no width of its
 * own; every view sets one).
 */
const widthClass = {
  narrow: 'max-w-page-narrow',
  medium: 'max-w-page-medium',
  default: 'max-w-page-default',
  wide: 'max-w-page-wide',
} as const

export type PageContainerWidth = keyof typeof widthClass

/**
 * Width and side gutter of one studio page (FE-SHELL-04). `AppLayout`'s
 * `<main>` is full width, so the page container centres itself and pads
 * both sides equally (logical, so it is the same in `fa` and `en`).
 */
export function PageContainer({
  width = 'default',
  className,
  children,
}: {
  width?: PageContainerWidth
  className?: string
  children: ReactNode
}) {
  return (
    <div
      data-slot="studio-page"
      data-width={width}
      className={cn(
        'mx-auto w-full px-gutter sm:px-gutter-wide',
        widthClass[width],
        className
      )}
    >
      {children}
    </div>
  )
}
