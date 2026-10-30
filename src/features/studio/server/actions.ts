'use server'

import { readSession, validAuthRequestOrigin } from '@/features/auth/server'
import { publishPage } from '@/features/studio/api/dashboard-api'
import { runApiAction, type ApiActionResult } from '@/lib/api/action-result'

/**
 * Publish the signed-in creator's page (FE-STUDIO-01): origin check, a
 * validated session, and the viewer id the page rendered for — a different
 * account in the cookie is refused rather than published. The backend decides
 * whether the page may go live (400 `USER_ALIAS_REQUIRED` without a username).
 */
export async function publishPageAction(
  viewerId: number
): Promise<ApiActionResult<null>> {
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
  return runApiAction(async () => {
    await publishPage(session.token)
    return null
  })
}
