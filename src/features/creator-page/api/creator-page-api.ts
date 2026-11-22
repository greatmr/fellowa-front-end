import 'server-only'

import {
  parseCreatorCollections,
  parseCreatorPostPage,
  parseCreatorProfile,
  parseCreatorTiers,
  parseOwnCreatorPage,
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

/** Posts per page of the public list: the API's own default. */
export const CREATOR_POSTS_PAGE_SIZE = 20

/**
 * One page of the creator's posts, gated ones included as TEASER or PARTIAL
 * (Q-51). No token: the backend answers the visitor's view to everyone, and
 * the list stays locked for members too (FQ-33 A); they read in full on the
 * post page.
 */
export async function getCreatorPostPage(id: number, page: number) {
  return parseCreatorPostPage(
    await apiGet<unknown>(`/landing/creators/${id}/posts`, {
      params: { page, pageSize: CREATOR_POSTS_PAGE_SIZE },
    }),
    id
  )
}

/**
 * The creator's collections (BE-CONT-15, FQ-35). Public, no token: a
 * membership never widens them (FQ-33 A).
 */
export async function getCreatorCollections(id: number) {
  return parseCreatorCollections(
    await apiGet<unknown>(`/landing/creators/${id}/collections`)
  )
}

/**
 * One page of a collection's posts, the same projection as the creator's
 * post list (TEASER and PARTIAL decided on the server); no token.
 */
export async function getCreatorCollectionPostPage(
  id: number,
  collectionId: number,
  page: number
) {
  return parseCreatorPostPage(
    await apiGet<unknown>(
      `/landing/creators/${id}/collections/${collectionId}/posts`,
      { params: { page, pageSize: CREATOR_POSTS_PAGE_SIZE } }
    ),
    id
  )
}

// ---- The owner's preview (BE-LAND-10) ---------------------------------------
// `/landing/me/page…` mirrors the public routes one for one, for the token's
// own page, published or not: the same shapes, so the same parsers. Posts are
// the anonymous visitor's projection (TEASER/PARTIAL, drafts left out). 400
// `USER_ALIAS_REQUIRED` while the account has no page.

const OWN_PAGE = '/landing/me/page'

/** The caller's page as visitors see it, plus `isPublished`. */
export async function getOwnCreatorPage(token: string) {
  return parseOwnCreatorPage(await apiGet<unknown>(OWN_PAGE, withBearer(token)))
}

export async function getOwnCreatorTiers(token: string) {
  return parseCreatorTiers(
    await apiGet<unknown>(`${OWN_PAGE}/tiers`, withBearer(token))
  )
}

/** `creatorId` is the caller's own id, checked against every post. */
export async function getOwnCreatorPostPage(
  token: string,
  creatorId: number,
  page: number
) {
  return parseCreatorPostPage(
    await apiGet<unknown>(`${OWN_PAGE}/posts`, {
      ...withBearer(token),
      params: { page, pageSize: CREATOR_POSTS_PAGE_SIZE },
    }),
    creatorId
  )
}

export async function getOwnCreatorCollections(token: string) {
  return parseCreatorCollections(
    await apiGet<unknown>(`${OWN_PAGE}/collections`, withBearer(token))
  )
}

/** 404 `CONTENT_COLLECTION_NOT_FOUND` for a collection not the caller's. */
export async function getOwnCreatorCollectionPostPage(
  token: string,
  creatorId: number,
  collectionId: number,
  page: number
) {
  return parseCreatorPostPage(
    await apiGet<unknown>(`${OWN_PAGE}/collections/${collectionId}/posts`, {
      ...withBearer(token),
      params: { page, pageSize: CREATOR_POSTS_PAGE_SIZE },
    }),
    creatorId
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
