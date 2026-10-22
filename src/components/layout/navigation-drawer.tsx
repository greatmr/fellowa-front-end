'use client'

import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { MenuIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

/** Shared keyboard/focus behavior for public and studio mobile navigation. */
export function NavigationDrawer({
  children,
  title,
  openLabel,
  closeLabel,
  desktopQuery,
  triggerClassName,
}: {
  children: ReactNode
  title: string
  openLabel: string
  closeLabel: string
  desktopQuery: string
  triggerClassName: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const desktop = window.matchMedia(desktopQuery)
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false)
    }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [desktopQuery])

  function closeOnLinkClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest('a')) {
      setOpen(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={triggerClassName}
          aria-label={openLabel}
        >
          <MenuIcon className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="start"
        closeLabel={closeLabel}
        aria-describedby={undefined}
        className="w-drawer gap-0 sm:max-w-drawer"
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <div className="h-full overflow-y-auto" onClick={closeOnLinkClick}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
