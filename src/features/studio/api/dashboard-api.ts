import 'server-only'

import {
  parseHasPayoutDetails,
  parseHasRows,
  parseProfileFacts,
} from '@/features/studio/schemas/dashboard'
import type { SetupFacts } from '@/features/studio/types/dashboard'
import { apiGet, apiPut, withBearer } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'

/**
 * The creator's setup facts from four reads. The backend has no dashboard
 * endpoint (CP-04's `GET /me/dashboard` is not built), so each step comes
 * from the route that owns its data.
 */
export async function getSetupFacts(
  token: string,
  viewerId: number
): Promise<SetupFacts> {
  const auth = withBearer(token)
  const [profile, tiers, posts, payout] = await Promise.all([
    apiGet<unknown>(`/user/${viewerId}/profile`, auth).then(parseProfileFacts),
    apiGet<unknown>('/tire', auth).then(parseHasRows),
    apiGet<unknown>('/content', auth).then(parseHasRows),
    getHasPayoutDetails(token),
  ])
  return {
    username: profile.username,
    isPublished: profile.isPublished,
    hasTier: tiers,
    hasPost: posts,
    hasPayoutDetails: payout,
  }
}

/** No payment record yet is a step left to do, not an error. */
async function getHasPayoutDetails(token: string): Promise<boolean> {
  try {
    return parseHasPayoutDetails(
      await apiGet<unknown>('/user/payment', withBearer(token))
    )
  } catch (error) {
    if (error instanceof ApiError && error.code === 'USER_PAYMENT_NOT_FOUND') {
      return false
    }
    throw error
  }
}

/** `PUT /user/publish`: idempotent; 400 `USER_ALIAS_REQUIRED` without a username. */
export async function publishPage(token: string): Promise<void> {
  await apiPut<unknown, undefined>(
    '/user/publish',
    undefined,
    withBearer(token)
  )
}
