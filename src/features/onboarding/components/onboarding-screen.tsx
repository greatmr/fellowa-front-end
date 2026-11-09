import { getSession } from '@/features/auth/server/session'
import { OnboardingFlow } from '@/features/onboarding/components/onboarding-flow'
import { loadOnboarding } from '@/features/onboarding/server/load-onboarding'
import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

/** Request-dependent onboarding content, inside the route's Suspense boundary. */
export async function OnboardingScreen({
  locale,
  searchParams,
}: {
  locale: Locale
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { step } = await searchParams
  const session = await getSession()
  if (!session) {
    return redirect({
      href: { pathname: '/auth', query: { returnTo: '/onboarding' } },
      locale,
    })
  }
  if (!session.user.isVerified) {
    return redirect({
      href: {
        pathname: '/auth/verify-email',
        query: { returnTo: '/onboarding' },
      },
      locale,
    })
  }

  return (
    <OnboardingFlow
      {...await loadOnboarding(session)}
      // After phone sign-up the display name is given (FE-AUTH-01); start at
      // the username. Any other value is ignored.
      startAtUsername={step === 'username'}
    />
  )
}
