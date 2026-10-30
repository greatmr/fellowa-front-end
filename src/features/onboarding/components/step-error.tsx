'use client'

import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import type { ApiError } from '@/lib/api/errors'

/** A failed save, inline: a 401 needs a way back in, anything else a retry. */
export function StepError({ error }: { error: ApiError }) {
  const t = useTranslations('onboarding.errors')

  return (
    <div
      role="alert"
      className="rounded-md border border-danger-border bg-danger-subtle p-3 text-body-sm text-danger-emphasis"
    >
      {error.status === 401 ? (
        <p>
          {t('sessionExpired')}{' '}
          <Link
            href={{
              pathname: '/auth/login',
              query: { returnTo: '/onboarding' },
            }}
            className="font-semibold underline underline-offset-4"
          >
            {t('signIn')}
          </Link>
        </p>
      ) : (
        <p>{t('saveFailed')}</p>
      )}
    </div>
  )
}
