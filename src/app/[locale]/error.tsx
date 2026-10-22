'use client'

import { RouteError } from '@/components/layout/route-error'

export default function LocaleError(props: {
  error: unknown
  retry: () => void
}) {
  return (
    <main id="main-content" className="flex flex-1 items-center" tabIndex={-1}>
      <RouteError {...props} />
    </main>
  )
}
