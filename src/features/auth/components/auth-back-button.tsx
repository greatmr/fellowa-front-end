'use client'

import { ArrowLeftIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'

import { authBackHref } from '@/features/auth/lib/auth-steps'
import { requestedReturnTo } from '@/features/auth/lib/return-to'
import { Link, usePathname } from '@/i18n/navigation'

/** The header's spacer where a step has no way back. */
export function AuthBackSpacer() {
  return <span aria-hidden className="size-10" />
}

/**
 * The frame's round back button (presentation `AuthLayout` @ fdb5f6c): on
 * every step after the first, keeping where the flow returns to. In-flow
 * links, so the number typed on the entry screen is still there.
 */
export function AuthBackButton() {
  const t = useTranslations('auth.layout')
  const pathname = usePathname()
  const returnTo = requestedReturnTo(
    useSearchParams().get('returnTo') ?? undefined
  )
  const href = authBackHref(pathname, returnTo)
  if (!href) return <AuthBackSpacer />

  return (
    <Link
      href={href}
      aria-label={t('back')}
      title={t('back')}
      className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 active:bg-ink-250 dark:active:bg-accent"
    >
      <ArrowLeftIcon className="size-5 rtl:rotate-180" aria-hidden />
    </Link>
  )
}
