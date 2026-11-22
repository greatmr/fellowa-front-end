'use client'

import { useId, useState, type ReactNode } from 'react'
import { ChevronDownIcon } from 'lucide-react'

import { useSidebarRailCollapsed } from '@/components/layout/sidebar-rail'
import { cn } from '@/lib/utils'

/**
 * Animated category disclosure (300ms on the smooth curve, presentation
 * Sidebar @ d843c3b); the desktop icon rail always shows its icons.
 */
export function NavGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  const collapsed = useSidebarRailCollapsed()
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
        className="group/disclosure flex w-full items-center justify-between gap-1 rounded-sm px-3 py-1.5 text-start text-label font-semibold text-muted-foreground transition-[color,transform] outline-none group-data-[collapsed=true]/sidebar:hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]"
      >
        <span className="truncate">{label}</span>
        <ChevronDownIcon
          className={cn(
            'size-4 shrink-0 text-ink-400 transition-transform duration-300 ease-smooth group-hover/disclosure:text-foreground motion-reduce:transition-none',
            expanded && 'rotate-180'
          )}
          aria-hidden
        />
      </button>
      <div
        id={contentId}
        inert={!expanded}
        className={cn(
          'grid transition-[grid-template-rows,opacity,translate] duration-300 ease-smooth motion-reduce:transition-none',
          expanded
            ? 'translate-y-0 grid-rows-[1fr] opacity-100'
            : '-translate-y-1 grid-rows-[0fr] opacity-0'
        )}
      >
        {/* Widened onto the rail padding so the start-edge active bar is not clipped. */}
        <div className="-mx-3 min-h-0 overflow-hidden px-3">{children}</div>
      </div>
    </div>
  )
}
