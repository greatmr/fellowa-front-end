import 'server-only'

import { getSession } from '@/features/auth/server'
import {
  getOwnCreatorCollections,
  getOwnCreatorPage,
  getOwnCreatorPostPage,
  getOwnCreatorTiers,
} from '@/features/creator-page/api/creator-page-api'
import { InvalidCreatorPageResponseError } from '@/features/creator-page/schemas/creator-page'
import type { CreatorPageData } from '@/features/creator-page/server/load-creator-page'
import { publicPageAddress } from '@/features/dashboard'
import { loadExploreCategories } from '@/features/explore/server'
import { ApiError } from '@/lib/api/errors'
import { env } from '@/lib/env'

export type OwnCreatorPageResult =
  | { kind: 'page'; data: CreatorPageData }
  /** No valid session, or the backend refused its token (401). */
  | { kind: 'signedOut' }
  /** Signed in with an unverified email: the panel's own gate applies. */
  | { kind: 'unverified' }
  /** 400 `USER_ALIAS_REQUIRED`: no username, so no page to preview yet. */
  | { kind: 'noPage' }

const hasStatus = (error: unknown, status: number) =>
  error instanceof ApiError && error.status === status

/**
 * Everything `/creator` renders: the signed-in creator's own page as visitors
 * see it, published or not (BE-LAND-10), read with the session's token from
 * `/landing/me/page…`, never from the public routes (an unpublished page is
 * 404 there). Tiers, posts and collections degrade alone, as on
 * `/creators/:id`; the profile read decides the outcome. Any other failure
 * reaches the route's error boundary.
 */
export async function loadOwnCreatorPage(): Promise<OwnCreatorPageResult> {
  const session = await getSession()
  if (!session) return { kind: 'signedOut' }
  if (!session.user.isVerified) return { kind: 'unverified' }
  const { token, user } = session

  try {
    const [own, tiers, posts, collections, categories] = await Promise.all([
      getOwnCreatorPage(token),
      getOwnCreatorTiers(token).catch(() => null),
      getOwnCreatorPostPage(token, user.id, 1).catch(() => null),
      getOwnCreatorCollections(token).catch(() => null),
      loadExploreCategories(),
    ])
    // The token's own page, or a backend defect: never another page.
    if (own.profile.id !== user.id) throw new InvalidCreatorPageResponseError()
    return {
      kind: 'page',
      data: {
        profile: own.profile,
        tiers,
        posts,
        collections,
        categoryTitle:
          categories.find((c) => c.id === own.profile.categoryId)?.title ??
          null,
        pageUrl: publicPageAddress(env.NEXT_PUBLIC_APP_URL, user.id).url,
        viewer: 'owner',
        ownPage: { isPublished: own.isPublished },
      },
    }
  } catch (error) {
    if (hasStatus(error, 401)) return { kind: 'signedOut' }
    if (
      error instanceof ApiError &&
      error.status === 400 &&
      error.code === 'USER_ALIAS_REQUIRED'
    ) {
      return { kind: 'noPage' }
    }
    throw error
  }
}
