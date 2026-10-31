'use client'

import { useSyncExternalStore } from 'react'
import { ThemeProvider } from 'next-themes'

import { ErrorLayout } from '@/components/layout/error-layout'
import { Button } from '@/components/ui/button'
import en from '../../messages/en.json'
import fa from '../../messages/fa.json'

import './globals.css'

const noopSubscribe = () => () => {}

/** Root-layout failures cannot depend on the locale or application providers. */
export default function GlobalError({
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  const locale = useSyncExternalStore(
    noopSubscribe,
    () => (window.location.pathname.split('/')[1] === 'en' ? 'en' : 'fa'),
    () => 'fa'
  )
  const messages = locale === 'en' ? en : fa

  return (
    <html
      lang={locale}
      dir={locale === 'fa' ? 'rtl' : 'ltr'}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        <title>{`${messages.errors.unexpectedTitle} · ${messages.common.appName}`}</title>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <main
            id="main-content"
            tabIndex={-1}
            className="flex min-h-dvh items-center"
          >
            <ErrorLayout
              brand={
                <span className="text-subtitle font-bold">
                  {messages.common.appName}
                </span>
              }
              title={messages.errors.unexpectedTitle}
              description={messages.errors.unexpectedBody}
              actions={
                <>
                  <Button onClick={retry}>{messages.common.retry}</Button>
                  <Button asChild variant="outline">
                    <a href={locale === 'en' ? '/en' : '/'}>
                      {messages.errors.backHome}
                    </a>
                  </Button>
                </>
              }
            />
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
