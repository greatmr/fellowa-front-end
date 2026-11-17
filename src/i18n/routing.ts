import { defineRouting } from 'next-intl/routing'

/**
 * Fellowa is a Persian-first product: `fa` is the default locale and renders
 * RTL. `en` exists so the layout is exercised in LTR and so copy is never
 * hardcoded; it is not a commitment to ship an English product.
 *
 * FE-I18N-01 (owner, 2026-11-17): no route shows a locale. `localePrefix:
 * "never"` serves every locale at the same URL; the proxy rewrites to the
 * `[locale]` segment internally and redirects old `/fa/…` and `/en/…` URLs to
 * the bare path, remembering the prefix's locale in the cookie.
 *
 * The language is Persian unless the visitor chose English in the language
 * switcher, which stores it in the `NEXT_LOCALE` cookie. The browser's
 * `Accept-Language` is never consulted — `src/proxy.ts` removes it before the
 * locale is resolved. `localeDetection` stays on because in next-intl it also
 * governs reading that cookie (`resolveLocale`: cookie and header are both
 * behind it); turning it off would make English unreachable.
 */
export const routing = defineRouting({
  locales: ['fa', 'en'],
  defaultLocale: 'fa',
  localePrefix: 'never',
  localeDetection: true,
  // Remember the choice across sessions (next-intl's default is a session
  // cookie).
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
})

export type Locale = (typeof routing.locales)[number]

/** Locales that render right-to-left. */
export const rtlLocales: readonly Locale[] = ['fa']

export function getDirection(locale: string): 'rtl' | 'ltr' {
  return rtlLocales.includes(locale as Locale) ? 'rtl' : 'ltr'
}
