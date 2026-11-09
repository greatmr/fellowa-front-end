import { Suspense, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { Logo } from '@/components/layout/logo'
import { SkipLink } from '@/components/layout/skip-link'
import { Link } from '@/i18n/navigation'

import { AuthBackButton, AuthBackSpacer } from './auth-back-button'
import { AuthFlowProvider } from './auth-flow-context'
import { AuthVisual } from './auth-visual'
import { SampleCreatorCards } from './sample-creator-cards'

/**
 * The auth frame (presentation `AuthLayout` @ fdb5f6c): the form column with
 * the logo and, after the first step, a round back button; the dark visual
 * column on wide screens. It holds the flow's in-memory state across the
 * per-step routes. The prototype has no theme switch here; settings has one.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('auth.layout')

  return (
    <AuthFlowProvider>
      <div className="relative flex min-h-dvh w-full flex-col bg-background text-foreground lg:flex-row">
        <SkipLink />
        <div className="relative flex flex-1 flex-col justify-between bg-card px-6 py-6 lg:min-h-dvh lg:w-1/2 lg:max-w-1/2 lg:px-14 lg:py-10">
          <header className="z-20 flex w-full items-center justify-between">
            <Link
              href="/"
              aria-label={t('home')}
              title={t('home')}
              className="group rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Logo />
            </Link>
            <Suspense fallback={<AuthBackSpacer />}>
              <AuthBackButton />
            </Suspense>
          </header>
          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto flex w-full max-w-100 flex-1 flex-col justify-center py-8 outline-none lg:py-12"
          >
            {children}
          </main>
          <div aria-hidden className="hidden h-4 lg:block" />
        </div>
        <aside
          aria-hidden
          className="relative hidden overflow-hidden bg-auth-visual lg:flex lg:w-1/2 lg:items-center lg:justify-center"
        >
          <div className="pointer-events-none absolute -start-32 -top-32 size-96 rounded-full bg-money-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -end-20 top-1/4 size-96 rounded-full bg-brand-600/35 blur-3xl" />
          <div className="pointer-events-none absolute start-1/4 bottom-10 size-80 rounded-full bg-violet-600/30 blur-3xl" />
          <div className="pointer-events-none absolute end-10 -bottom-20 size-72 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 dot-grid opacity-15" />
          <div className="relative z-10 flex w-full max-w-115 items-center justify-center p-8">
            <AuthVisual samples={<SampleCreatorCards />} />
          </div>
        </aside>
      </div>
    </AuthFlowProvider>
  )
}
