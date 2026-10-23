import type { ReactNode } from 'react'

import { PublicFooter } from '@/components/layout/public-footer'
import { PublicHeader } from '@/components/layout/public-header'
import { SkipLink } from '@/components/layout/skip-link'

/** Public pages share their navigation without inheriting the studio rail. */
export function DefaultLayout({
  children,
  authNavigation,
}: {
  children: ReactNode
  authNavigation?: ReactNode
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SkipLink />
      <PublicHeader authNavigation={authNavigation} />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <PublicFooter />
    </div>
  )
}
