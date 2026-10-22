import { defineRouting } from 'next-intl/routing'

/**
 * Fellowa is a Persian-first product: `fa` is the default locale and renders
 * RTL. `en` exists so the layout is exercised in LTR and so copy is never
 * hardcoded; it is not a commitment to ship an English product.
 *
 * `localePrefix: "as-needed"` keeps Persian URLs clean (`/creator/x`) and
 * prefixes the others (`/en/creator/x`).
 */
export const routing = defineRouting({
  locales: ['fa', 'en'],
  defaultLocale: 'fa',
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]

/** Locales that render right-to-left. */
export const rtlLocales: readonly Locale[] = ['fa']

export function getDirection(locale: string): 'rtl' | 'ltr' {
  return rtlLocales.includes(locale as Locale) ? 'rtl' : 'ltr'
}
