import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'

import { AppProviders } from '@/components/providers/app-providers'
import { getDirection, routing } from '@/i18n/routing'
import { cn } from '@/lib/utils'

import '../globals.css'

/*
 * Vazirmatn (FQ-1). The two files are subsets of one face with no
 * unicode-range, so the browser checks them last to first per character. Latin
 * stays last so it serves the characters both contain (space, NBSP, "A"), the
 * same result as the upstream CSS.
 */
const brandFont = localFont({
  src: [
    {
      path: '../../../public/fonts/vazirmatn/vazirmatn-arabic-wght-normal.woff2',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/vazirmatn/vazirmatn-latin-wght-normal.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-brand',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fellowa',
  description: 'Creator subscription platform',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  return (
    <html
      lang={locale}
      dir={getDirection(locale)}
      className={cn(brandFont.variable, 'h-full')}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
