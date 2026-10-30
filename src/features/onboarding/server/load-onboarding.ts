import 'server-only'

import type { AuthSession } from '@/features/auth/server'
import { getSocialLinks } from '@/features/onboarding/api/onboarding-api'
import type { OnboardingData } from '@/features/onboarding/types/onboarding'
import { getPersonal } from '@/features/settings/server'

/** What `/onboarding` starts from; the phone number stays on the server. */
export async function loadOnboarding(
  session: AuthSession
): Promise<OnboardingData> {
  const [personal, links] = await Promise.all([
    getPersonal(session.token),
    getSocialLinks(session.token),
  ])
  return {
    viewerId: session.user.id,
    alias: session.user.alias,
    firstName: personal.firstName,
    lastName: personal.lastName,
    links,
  }
}
