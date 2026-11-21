import 'server-only'

import {
  parseDashboardPosts,
  parseHasPayoutDetails,
  parseHasRows,
  parseProfile,
} from '@/features/studio/schemas/dashboard'
import type {
  CreatorIdentity,
  DashboardPost,
  SetupFacts,
} from '@/features/studio/types/dashboard'
import { apiGet, apiPut, withBearer } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'

/**
 * The creator's setup facts (all but posts) and identity from three reads. The backend has no
 * dashboard endpoint (CP-04's `GET /me/dashboard` is not built), so each step
 * comes from the route that owns its data.
 */
export async function getDashboardProfile(
  token: string,
  viewerId: number
): Promise<{ facts: Omit<SetupFacts, 'hasPost'>; identity: CreatorIdentity }> {
  const auth = withBearer(token)
  const [profile, tiers, payout] = await Promise.all([
    apiGet<unknown>(`/user/${viewerId}/profile`, auth).then(parseProfile),
    apiGet<unknown>('/tire', auth).then(parseHasRows),
    getHasPayoutDetails(token),
  ])
  return {
    facts: {
      username: profile.username,
      isPublished: profile.isPublished,
      hasProfileImages: profile.hasProfileImages,
      hasTier: tiers,
      hasPayoutDetails: payout,
    },
    identity: profile.identity,
  }
}

/**
 * `GET /content`: the owner's posts, newest first. One read feeds both the
 * recent-posts list and the checklist's "first post" step.
 */
export async function getRecentPosts(token: string): Promise<DashboardPost[]> {
  return parseDashboardPosts(
    await apiGet<unknown>('/content', withBearer(token))
  )
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
