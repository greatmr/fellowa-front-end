import 'server-only'

import {
  parseCreatorPosts,
  parseCreatorProfile,
  parseCreatorTiers,
} from '@/features/creator-page/schemas/creator-page'
import { apiDelete, apiGet, apiPost, withBearer } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'

/**
 * Public creator page reads (BE-LAND-03). An unknown or unpublished creator
 * is a 404 on every route. The profile takes an optional token: with a valid
 * one the backend adds whether the viewer follows (BE-LAND-09).
 */
export async function getCreatorProfile(id: number, token?: string) {
  return parseCreatorProfile(
    await apiGet<unknown>(
      `/landing/creators/${id}`,
      token ? withBearer(token) : undefined
    )
  )
}

export async function getCreatorTiers(id: number) {
  return parseCreatorTiers(
    await apiGet<unknown>(`/landing/creators/${id}/tiers`)
  )
}

export async function getCreatorPosts(id: number) {
  return parseCreatorPosts(
    await apiGet<unknown>(`/landing/creators/${id}/content`)
  )
}

/**
 * Follow or unfollow (`/subscription/follow`, JWT). Idempotent from the
 * caller's side: following someone already followed (409) and unfollowing
 * someone not followed (404) both end in the state that was asked for.
 */
export async function setFollowing(
  token: string,
  creatorId: number,
  follow: boolean
): Promise<void> {
  try {
    if (follow) {
      await apiPost<unknown, { followingUserId: number }>(
        '/subscription/follow',
        { followingUserId: creatorId },
        withBearer(token)
      )
    } else {
      await apiDelete<unknown>('/subscription/follow', {
        ...withBearer(token),
        params: { followingUserId: creatorId },
      })
    }
  } catch (error) {
    const settled =
      error instanceof ApiError &&
      ((follow && error.code === 'SUB_ALREADY_FOLLOWING') ||
        (!follow && error.code === 'SUB_FOLLOW_NOT_FOUND'))
    if (!settled) throw error
  }
}
