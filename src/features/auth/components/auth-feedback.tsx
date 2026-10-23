'use client'

import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import type { AuthActionState } from '@/features/auth/types'

export function AuthFeedback({
  state,
  returnTo,
}: {
  state: AuthActionState
  returnTo?: string
}) {
  const t = useTranslations('auth')

  if (state.status !== 'error' || !state.error) return null

  if (state.error === 'expiredSession') {
    return (
      <div
        role="alert"
        className="space-y-2 rounded-md border border-danger-border bg-danger-subtle p-3 text-body text-danger-emphasis"
      >
        <p className="font-semibold">{t('sessionExpired.title')}</p>
        <p>{t('sessionExpired.body')}</p>
        <Link
          href={
            returnTo
              ? { pathname: '/auth/login', query: { returnTo } }
              : '/auth/login'
          }
          className="font-semibold underline underline-offset-4"
        >
          {t('sessionExpired.login')}
        </Link>
      </div>
    )
  }

  return (
    <p
      role="alert"
      className="rounded-md border border-danger-border bg-danger-subtle p-3 text-body text-danger-emphasis"
    >
      {t(`errors.${state.error}`)}
    </p>
  )
}
