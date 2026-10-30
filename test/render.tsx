import type { ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { TIME_ZONE } from '@/i18n/time-zone'
import en from '../messages/en.json'
import fa from '../messages/fa.json'

const messages = { fa, en } as const

type Options = Omit<RenderOptions, 'wrapper'> & {
  locale?: keyof typeof messages
}

/**
 * Render with the real translations (default `fa`). Use this for anything that
 * calls useTranslations; add the QueryClient wrapper here when the first
 * component under test needs it, rather than per test.
 */
export function renderWithIntl(
  ui: ReactElement,
  { locale = 'fa', ...options }: Options = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider
        locale={locale}
        messages={messages[locale]}
        timeZone={TIME_ZONE}
      >
        {children}
      </NextIntlClientProvider>
    ),
    ...options,
  })
}
