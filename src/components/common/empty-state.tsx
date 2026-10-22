import * as React from 'react'

import { cn } from '@/lib/utils'

type Props = Omit<React.ComponentProps<'div'>, 'title'> & {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  /** A button or link; composed rather than wired, so this stays a server component. */
  action?: React.ReactNode
}

/** Empty list / nothing-yet panel (presentation `EmptyState`). Text comes from the caller's translations. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: Props) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-md border bg-card px-6 py-14 text-center',
        className
      )}
      {...props}
    >
      {icon ? (
        <div
          className="text-mist [&_svg:not([class*='size-'])]:size-10"
          aria-hidden
        >
          {icon}
        </div>
      ) : null}
      <p className="text-body font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="max-w-xs text-label leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
