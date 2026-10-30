'use server'

import { z } from 'zod'

import { listExploreCreators } from '@/features/explore/api/explore-api'
import {
  InvalidExploreResponseError,
  exploreQuerySchema,
} from '@/features/explore/schemas/creator'
import type {
  ExploreCreatorPage,
  ExploreQuery,
} from '@/features/explore/types/creator'
import { readOptionalSessionToken } from '@/features/auth/server'
import { runApiAction, type ApiActionResult } from '@/lib/api/action-result'

const viewerSchema = z.number().int().positive().safe().nullable()

/**
 * Explore lists are public data; a token only lets the backend leave the
 * viewer's own page out (BE-LAND-04). The caller's query key names the viewer
 * it rendered for, so the request must be made as that same viewer: the
 * anonymous key never sends a token, and a cookie that now belongs to someone
 * else is refused rather than cached under the wrong key. The backend verifies
 * the token's signature, so no profile round-trip is needed here.
 */
export async function listExploreCreatorsForHook(
  viewerId: number | null,
  input: ExploreQuery
): Promise<ApiActionResult<ExploreCreatorPage>> {
  const query = exploreQuerySchema.safeParse(input)
  if (!query.success || !viewerSchema.safeParse(viewerId).success) {
    return { ok: false, status: 400, code: 'INVALID_REQUEST' }
  }
  let token: string | undefined
  if (viewerId !== null) {
    const session = await readOptionalSessionToken()
    if (!session || session.userId !== viewerId) {
      return { ok: false, status: 401, code: 'SESSION_CHANGED' }
    }
    token = session.token
  }
  return runApiAction(
    () => listExploreCreators(query.data, token),
    (error) =>
      error instanceof InvalidExploreResponseError
        ? { code: 'INVALID_EXPLORE_RESPONSE' }
        : undefined
  )
}
