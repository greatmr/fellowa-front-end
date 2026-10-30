'use server'

import { z } from 'zod'

import { setFollowing } from '@/features/creator-page/api/creator-page-api'
import { readSession, validAuthRequestOrigin } from '@/features/auth/server'
import { runApiAction, type ApiActionResult } from '@/lib/api/action-result'

const inputSchema = z.object({
  creatorId: z.number().int().positive().max(2_147_483_647),
  follow: z.boolean(),
})

/**
 * Follow or unfollow a creator from their public page (FE-PAGE-02). A
 * mutation, so it checks the request origin and a validated session; the
 * backend refuses self-follow (BE-SUBS-05) and owns the result.
 */
export async function setFollowingAction(input: {
  creatorId: number
  follow: boolean
}): Promise<ApiActionResult<{ isFollowing: boolean }>> {
  if (!(await validAuthRequestOrigin())) {
    return { ok: false, status: 403, code: 'INVALID_REQUEST' }
  }
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, status: 400, code: 'INVALID_REQUEST' }
  }
  let session: Awaited<ReturnType<typeof readSession>>
  try {
    session = await readSession()
  } catch {
    // The session could not be checked (API down), which is not an expiry.
    return { ok: false, code: 'SESSION_CHECK_FAILED', isNetworkError: true }
  }
  if (!session) return { ok: false, status: 401, code: 'SESSION_EXPIRED' }

  const { creatorId, follow } = parsed.data
  return runApiAction(async () => {
    await setFollowing(session.token, creatorId, follow)
    return { isFollowing: follow }
  })
}
