import type { ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { TIME_ZONE } from '@/i18n/time-zone'
import en from '../messages/en.json'
import fa from '../messages/fa.json'

const messages = { fa, en } as const

type Options = Omit<RenderOptions, 'wrapper'> & {
  locale?: keyof typeof messages
  /**
   * Throw every next-intl error. By default next-intl only logs a missing key
   * or a key that resolves to an object and renders the key path, so a broken
   * `t()` call passes any test that does not read that text.
   */
  strict?: boolean
}

const throwIntlError = (error: Error) => {
  throw error
}

/**
 * Render with the real translations (default `fa`). Use this for anything that
 * calls useTranslations; add the QueryClient wrapper here when the first
 * component under test needs it, rather than per test.
 */
export function renderWithIntl(
  ui: ReactElement,
  { locale = 'fa', strict = false, ...options }: Options = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider
        locale={locale}
        messages={messages[locale]}
        timeZone={TIME_ZONE}
        onError={strict ? throwIntlError : undefined}
      >
        {children}
      </NextIntlClientProvider>
    ),
    ...options,
  })
}
