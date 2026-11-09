import { getTranslations } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'

import { CompleteAccountForm } from '@/features/auth/components/complete-account-form'
import { CredentialsForm } from '@/features/auth/components/credentials-form'
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'
import { PageAddressForm } from '@/features/auth/components/page-address-form'
import { PhoneAuthFlow } from '@/features/auth/components/phone-auth-flow'
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form'
import { VerificationForm } from '@/features/auth/components/verification-form'
import { googleErrorFrom } from '@/features/auth/lib/google-error'
import {
  afterAccountDestination,
  authHref,
  choosesPageAddress,
  requestedReturnTo,
  safeReturnTo,
} from '@/features/auth/lib/return-to'
import { googleSignInEnabled } from '@/features/auth/server/google-sign-in'
import { getSession } from '@/features/auth/server/session'
import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

type Props = {
  mode:
    | 'entry'
    | 'otp'
    | 'password'
    | 'email-login'
    | 'email-register'
    | 'verify-email'
    | 'forgot-password'
    | 'reset-password'
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
  const requested = requestedReturnTo(query.returnTo)
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
          pathname: '/auth',
          query: { returnTo, reason: 'expired' },
        },
        locale,
      })
    }
    return <VerificationForm email={session.user.email} returnTo={returnTo} />
  }

  if (mode === 'forgot-password') {
    return <ForgotPasswordForm returnTo={returnTo} />
  }
  if (mode === 'reset-password') {
    return <ResetPasswordForm returnTo={returnTo} />
  }

  const t = await getTranslations('auth')

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
      {mode === 'entry' || mode === 'otp' || mode === 'password' ? (
        // Phone-first (FQ-16): one flow signs in and signs up.
        <PhoneAuthFlow
          step={mode}
          returnTo={requested}
          google={
            mode === 'entry'
              ? {
                  enabled: googleSignInEnabled(),
                  locale,
                  error: googleErrorFrom(query.googleError),
                }
              : undefined
          }
        />
      ) : (
        <CredentialsForm
          mode={mode === 'email-login' ? 'login' : 'register'}
          returnTo={returnTo}
        />
      )}
    </>
  )
}

/**
 * `/auth/account` (FE-AUTH-01, FE-AUTH-04): the display name and optional
 * password of a signed-in account, right after a first sign-in.
 */
export async function AccountScreen({ locale, searchParams }: StepProps) {
  const query = await searchParams
  const returnTo = requestedReturnTo(query.returnTo)
  const session = await getSession()
  if (!session) {
    return redirect({ href: authHref('/auth', returnTo), locale })
  }
  if (!session.user.isVerified) {
    return redirect({ href: '/auth/verify-email', locale })
  }
  return (
    <CompleteAccountForm
      next={afterAccountDestination(session.user, returnTo)}
      firstOfSteps={choosesPageAddress(session.user, returnTo)}
    />
  )
}

/**
 * `/auth/url` (FE-AUTH-04): the page address, step 2 of 2. An account that
 * already has a page has nothing to choose here and goes on.
 */
export async function PageAddressScreen({ locale, searchParams }: StepProps) {
  const query = await searchParams
  const returnTo = requestedReturnTo(query.returnTo)
  const session = await getSession()
  if (!session) {
    return redirect({ href: authHref('/auth', returnTo), locale })
  }
  if (!session.user.isVerified) {
    return redirect({ href: '/auth/verify-email', locale })
  }
  if (!choosesPageAddress(session.user)) {
    return redirect({ href: safeReturnTo(returnTo), locale })
  }
  return (
    <PageAddressForm destination={safeReturnTo(returnTo)} returnTo={returnTo} />
  )
}

type StepProps = {
  locale: Locale
  searchParams: Promise<Record<string, string | string[] | undefined>>
}
