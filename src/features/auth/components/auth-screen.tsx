import { getTranslations } from 'next-intl/server'

import { CompleteAccountForm } from '@/features/auth/components/complete-account-form'
import { CredentialsForm } from '@/features/auth/components/credentials-form'
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'
import { InterestsForm } from '@/features/auth/components/interests-form'
import { PageAddressForm } from '@/features/auth/components/page-address-form'
import { PageCategoryForm } from '@/features/auth/components/page-category-form'
import { PhoneAuthFlow } from '@/features/auth/components/phone-auth-flow'
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form'
import { VerificationForm } from '@/features/auth/components/verification-form'
import {
  INTERESTS_PATH,
  PAGE_CATEGORY_PATH,
  returnsFromInterests,
} from '@/features/auth/lib/auth-steps'
import { googleErrorFrom } from '@/features/auth/lib/google-error'
import {
  addressStepStandsAlone,
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

/**
 * Request-dependent auth content: it renders inside the auth layout's
 * Suspense boundary (`AuthLayout`), so moving between steps keeps the current
 * one on screen until this one is ready.
 */
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
 * `/auth/url` (FE-AUTH-04): the page address, step 2 of 4 of sign-up, then on
 * to the interests (FE-AUTH-08); or on its own when opened from settings or
 * the studio (FE-ONB-02). An account that already has a page has nothing to
 * choose and goes on — unless it is back from the interests step in sign-up
 * (`BACK_FROM_INTERESTS`): then it sees its page's address and may change it.
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
  const standsAlone = addressStepStandsAlone(returnTo)
  const backFromInterests = !standsAlone && returnsFromInterests(query.from)
  if (!choosesPageAddress(session.user) && !backFromInterests) {
    return redirect({ href: safeReturnTo(returnTo), locale })
  }
  return (
    <PageAddressForm
      destination={standsAlone ? safeReturnTo(returnTo) : INTERESTS_PATH}
      returnTo={returnTo}
      profileName={session.user.displayName}
      currentAddress={backFromInterests ? session.user.alias : null}
      backFromInterests={backFromInterests}
    />
  )
}

/**
 * `/auth/interests` (FE-AUTH-08): the categories the account likes, step 3 of
 * 4 of sign-up, then the page's category. Any signed-in account may open it,
 * page or not: the set is its own, and skipping changes nothing. An account
 * with no page (a fan) goes on to its destination: it has no category to
 * give, and is not pushed into making a page.
 */
export async function InterestsScreen({ locale, searchParams }: StepProps) {
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
    <InterestsForm
      viewerId={session.user.id}
      next={
        session.user.alias === null
          ? safeReturnTo(returnTo)
          : authHref(PAGE_CATEGORY_PATH, returnTo)
      }
    />
  )
}

/**
 * `/auth/category` (FE-AUTH-08, FQ-23): the page's one category, step 4 of 4
 * of sign-up. It starts from the owner profile the session has just read
 * (`categoryId`), so no other request is made for it. An account with no page
 * has no category to choose and goes on to its destination.
 */
export async function PageCategoryScreen({ locale, searchParams }: StepProps) {
  const query = await searchParams
  const returnTo = requestedReturnTo(query.returnTo)
  const session = await getSession()
  if (!session) {
    return redirect({ href: authHref('/auth', returnTo), locale })
  }
  if (!session.user.isVerified) {
    return redirect({ href: '/auth/verify-email', locale })
  }
  if (session.user.alias === null) {
    return redirect({ href: safeReturnTo(returnTo), locale })
  }
  return (
    <PageCategoryForm
      viewerId={session.user.id}
      currentCategoryId={session.user.categoryId ?? null}
      destination={safeReturnTo(returnTo)}
      returnTo={returnTo}
    />
  )
}

type StepProps = {
  locale: Locale
  searchParams: Promise<Record<string, string | string[] | undefined>>
}
