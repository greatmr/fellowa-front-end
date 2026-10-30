import { getSession } from '@/features/auth/server/session'
import { OnboardingFlow } from '@/features/onboarding/components/onboarding-flow'
import { loadOnboarding } from '@/features/onboarding/server/load-onboarding'
import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

/** Request-dependent onboarding content, inside the route's Suspense boundary. */
export async function OnboardingScreen({ locale }: { locale: Locale }) {
  const session = await getSession()
  if (!session) {
    return redirect({
      href: { pathname: '/auth/login', query: { returnTo: '/onboarding' } },
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

  return <OnboardingFlow {...await loadOnboarding(session)} />
}
