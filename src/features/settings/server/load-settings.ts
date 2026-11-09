import 'server-only'

import { reusableDisplayName, type AuthSession } from '@/features/auth/server'
import { getPageName, getPersonal } from '@/features/settings/api/settings-api'
import type {
  PageNameState,
  PasswordState,
  PersonalDetails,
} from '@/features/settings/types/settings'

export type SettingsData = {
  viewerId: number
  email: string | null
  isVerified: boolean
  personal: PersonalDetails
  /** `null` when it could not be read: only that section degrades. */
  page: PageNameState | null
  password: PasswordState
}

/** What `/settings` renders for the signed-in account (FE-SET-01). */
export async function loadSettings(
  session: AuthSession
): Promise<SettingsData> {
  const [personal, page] = await Promise.all([
    getPersonal(session.token),
    // Not logged: the error's cause carries the request, bearer included.
    getPageName(session.token).catch(() => null),
  ])
  return {
    viewerId: session.user.id,
    email: session.user.email,
    isVerified: session.user.isVerified,
    personal,
    page,
    // From the session's owner-profile read: no request of its own.
    password: {
      hasPassword: session.user.hasPassword,
      hasDisplayName: reusableDisplayName(session.user.displayName) !== null,
    },
  }
}
