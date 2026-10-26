'use client'

import { useId, useState, type ReactNode } from 'react'
import { ChevronDownIcon } from 'lucide-react'

import { useStudioRailCollapsed } from '@/components/layout/studio-desktop-rail'
import { cn } from '@/lib/utils'

/** Animated category disclosure; the desktop icon rail always shows its icons. */
export function StudioNavGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  const collapsed = useStudioRailCollapsed()
  const expanded = collapsed || open
  const contentId = useId()

  return (
    <div className="mb-2.5 border-t border-border/70 pt-2 group-data-[collapsed=true]/sidebar:border-t-0 first:border-t-0">
      <div
        className="hidden h-px w-8 bg-border group-data-[collapsed=true]/sidebar:mx-auto group-data-[collapsed=true]/sidebar:block"
        aria-hidden
      />
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-1 rounded-md px-3 py-2 text-label font-semibold text-muted-foreground transition-colors outline-none group-data-[collapsed=true]/sidebar:hidden hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="truncate">{label}</span>
        <ChevronDownIcon
          className={cn(
            'size-3.5 shrink-0 transition-transform duration-300 motion-reduce:transition-none',
            expanded && 'rotate-180'
          )}
          aria-hidden
        />
      </button>
      <div
        id={contentId}
        inert={!expanded}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
