import 'server-only'

import { validAuthRequestOrigin } from '@/features/auth/server/request-security'
import { readSession, type AuthSession } from '@/features/auth/server/session'
import type { ApiActionResult } from '@/lib/api/action-result'

/**
 * The session for a mutation on the signed-in account: origin check, a
 * validated session (a fresh owner-profile read), and the viewer id the page
 * rendered for — a different account in the cookie is refused rather than
 * edited.
 */
export async function authorizedViewerSession(
  viewerId: number
): Promise<ApiActionResult<AuthSession>> {
  if (!(await validAuthRequestOrigin())) {
    return { ok: false, status: 403, code: 'INVALID_REQUEST' }
  }
  let session: Awaited<ReturnType<typeof readSession>>
  try {
    session = await readSession()
  } catch {
    // The session could not be checked (API down), which is not an expiry.
    return { ok: false, code: 'SESSION_CHECK_FAILED', isNetworkError: true }
  }
  if (!session) return { ok: false, status: 401, code: 'SESSION_EXPIRED' }
  if (session.user.id !== viewerId) {
    return { ok: false, status: 401, code: 'SESSION_CHANGED' }
  }
  return { ok: true, data: session }
}

/** {@link authorizedViewerSession}, for a mutation that needs only the token. */
export async function authorizedViewerToken(
  viewerId: number
): Promise<ApiActionResult<string>> {
  const session = await authorizedViewerSession(viewerId)
  return session.ok ? { ok: true, data: session.data.token } : session
}
