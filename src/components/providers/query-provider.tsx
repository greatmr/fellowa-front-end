'use client'

import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'

import { getQueryClient } from '@/lib/api/query-client'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // `useState` (not a module-scope client) so a re-render never swaps the
  // client and discards the cache, and so the server never shares one.
  const [queryClient] = useState(getQueryClient)

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
