import type { ReactNode } from 'react'
import { ArrowLeftIcon, SparklesIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { ThemeSwitch } from '@/components/common/theme-switch'
import { Logo } from '@/components/layout/logo'
import { SkipLink } from '@/components/layout/skip-link'
import { Link } from '@/i18n/navigation'

/** The presentation's form-and-brand composition, without demo creator data. */
export function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('auth.layout')

  return (
    <div className="grid min-h-dvh bg-background text-foreground lg:grid-cols-2">
      <SkipLink />
      <div className="flex min-w-0 flex-col px-5 py-6 sm:px-10 lg:px-14 lg:py-10">
        <header className="flex items-center justify-between gap-6">
          <Link
            href="/"
            aria-label={t('home')}
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md text-body font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('home')}
            <ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12 outline-none lg:py-16"
        >
          {children}
        </main>
        <footer className="mx-auto w-full max-w-sm">
          <ThemeSwitch />
        </footer>
      </div>
      <aside className="relative hidden overflow-hidden bg-inverse p-12 text-inverse-foreground lg:flex lg:items-center lg:justify-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-24 -top-24 size-96 rounded-full bg-brand-600/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -start-20 -bottom-20 size-80 rounded-full bg-violet-600/30 blur-3xl"
        />
        <div className="relative max-w-sm space-y-8">
          <div
            aria-hidden
            className="inline-flex rounded-card border border-inverse-foreground/20 bg-inverse-foreground/10 p-5 shadow-panel"
          >
            <SparklesIcon className="size-10" />
          </div>
          <h2 className="text-display font-bold">{t('brandTitle')}</h2>
          <p className="text-subtitle leading-relaxed text-inverse-foreground/80">
            {t('brandBody')}
          </p>
          <p className="border-s-2 border-brand-400 ps-4 text-body text-inverse-foreground/80">
            {t('brandNote')}
          </p>
        </div>
      </aside>
    </div>
  )
}
