import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { renderWithIntl } from '../../../../test/render'

export function renderAuth(
  ui: ReactElement,
  {
    locale = 'en',
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),
  }: { locale?: 'en' | 'fa'; queryClient?: QueryClient } = {}
) {
  return {
    ...renderWithIntl(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
      { locale }
    ),
    queryClient,
  }
}

export function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error('Promise resolver is not initialized')
  }
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}
