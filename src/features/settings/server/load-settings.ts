import 'server-only'

import type { AuthSession } from '@/features/auth/server'
import { getPersonal } from '@/features/settings/api/settings-api'
import type { PersonalDetails } from '@/features/settings/types/settings'

export type SettingsData = {
  viewerId: number
  email: string
  isVerified: boolean
  personal: PersonalDetails
}

/** What `/settings` renders for the signed-in account (FE-SET-01). */
export async function loadSettings(
  session: AuthSession
): Promise<SettingsData> {
  return {
    viewerId: session.user.id,
    email: session.user.email,
    isVerified: session.user.isVerified,
    personal: await getPersonal(session.token),
  }
}
