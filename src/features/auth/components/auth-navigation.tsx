import { AuthActions } from '@/features/auth/components/auth-actions'
import { getSession } from '@/features/auth/server/session'

/** Reads the session on the server; the actions themselves are plain. */
export async function AuthNavigation() {
  const session = await getSession()
  return <AuthActions signedIn={session !== null} />
}
