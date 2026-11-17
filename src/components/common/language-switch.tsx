'use client'

import { useEffect, useId, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { getPathname, usePathname } from '@/i18n/navigation'
import { getDirection, type Locale } from '@/i18n/routing'
import { hardReload } from '@/lib/hard-reload'
import { cn } from '@/lib/utils'

/** Each language named in itself, so it is recognisable from either one. */
const OPTIONS: readonly { value: Locale; name: string }[] = [
  { value: 'fa', name: 'فارسی' },
  { value: 'en', name: 'English' },
]

/**
 * Persian · English (FE-I18N-01). URLs carry no locale, so choosing one keeps
 * the page, its query and fragment. It reloads the same address with the
 * chosen locale as a prefix (`/en/creators?q=…`); the proxy stores the locale
 * in the `NEXT_LOCALE` cookie and redirects to the bare address. A full
 * document load on purpose: both languages share every URL, so the client
 * router's cache (5 minutes for static pages) would otherwise show visited
 * pages in the old language.
 *
 * It looks like `ThemeSwitch` but is two toggle buttons, not a radio group:
 * choosing reloads the page, so it happens only on click, Enter or Space,
 * never on arrow-key focus moves (WCAG 3.2.2).
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations('language')
  const locale = useLocale()
  const pathname = usePathname()
  const [switching, setSwitching] = useState(false)
  const labelId = useId()

  // A page restored from the back-forward cache keeps its state; let the
  // switch work again there.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setSwitching(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  function choose(next: Locale) {
    if (next === locale || switching) return
    setSwitching(true)
    // Read at click time: the query and fragment are part of "the same page".
    const { search, hash } = window.location
    hardReload(
      getPathname({
        href: `${pathname}${search}${hash}`,
        locale: next,
        forcePrefix: true,
      })
    )
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <p
        id={labelId}
        className="text-label font-semibold text-muted-foreground"
      >
        {t('label')}
      </p>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-busy={switching || undefined}
        className="grid grid-cols-2 gap-1 rounded-md bg-secondary p-1"
      >
        {OPTIONS.map(({ value, name }) => {
          const selected = locale === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              lang={value}
              dir={getDirection(value)}
              onClick={() => choose(value)}
              className={cn(
                'inline-flex min-w-0 items-center justify-center rounded-md px-1 py-1.5 text-label font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                selected
                  ? 'bg-card text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="truncate">{name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
