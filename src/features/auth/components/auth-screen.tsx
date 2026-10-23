import { getTranslations } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'

import { CredentialsForm } from '@/features/auth/components/credentials-form'
import { VerificationForm } from '@/features/auth/components/verification-form'
import { parseAuthFeedback } from '@/features/auth/lib/native-feedback'
import { safeReturnTo } from '@/features/auth/lib/return-to'
import {
  loginAction,
  logoutAction,
  registerAction,
  resendEmailAction,
  verifyEmailAction,
} from '@/features/auth/server/actions'
import { getSession } from '@/features/auth/server/session'
import { getPathname, redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

type Props = {
  mode: 'login' | 'register' | 'verify-email'
  locale: Locale
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export function AuthScreenFallback() {
  const t = useTranslations('common')
  return (
    <div role="status" aria-label={t('loading')} className="space-y-5">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

/** Request-dependent auth content stays inside the route's Suspense boundary. */
export async function AuthScreen({ mode, locale, searchParams }: Props) {
  const query = await searchParams
  const returnTo = safeReturnTo(query.returnTo)
  const initialState = parseAuthFeedback(query.feedback)
  const permalink = getPathname({
    locale,
    href: { pathname: `/auth/${mode}`, query: { returnTo } },
  })
  const session = await getSession()

  if (session?.user.isVerified) {
    return redirect({ href: returnTo, locale })
  }
  if (session && mode !== 'verify-email') {
    return redirect({
      href: { pathname: '/auth/verify-email', query: { returnTo } },
      locale,
    })
  }

  if (mode === 'verify-email') {
    if (!session) {
      return redirect({
        href: {
          pathname: '/auth/login',
          query: { returnTo, reason: 'expired' },
        },
        locale,
      })
    }
    return (
      <VerificationForm
        email={session.user.email}
        returnTo={returnTo}
        permalink={permalink}
        initialState={initialState}
        verifyAction={verifyEmailAction.bind(null, locale, returnTo)}
        resendAction={resendEmailAction.bind(null, locale)}
        changeAccountAction={logoutAction.bind(null, locale)}
      />
    )
  }

  const t = await getTranslations('auth')
  const action = mode === 'login' ? loginAction : registerAction

  return (
    <>
      {query.reason === 'expired' && (
        <p
          role="alert"
          className="mb-5 rounded-md border border-warning-border bg-warning-subtle p-3 text-body-sm text-warning-emphasis"
        >
          {t('sessionExpired.body')}
        </p>
      )}
      <CredentialsForm
        mode={mode}
        returnTo={returnTo}
        permalink={permalink}
        initialState={initialState}
        action={action.bind(null, locale, returnTo)}
      />
    </>
  )
}
