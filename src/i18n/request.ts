import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import { routing } from '@/i18n/routing'
import { TIME_ZONE } from '@/i18n/time-zone'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Every date is shown in Tehran time (owner decision 2026-10-30); the
    // client provider inherits it, so server and browser renders agree.
    timeZone: TIME_ZONE,
  }
})
