import 'server-only'

import { readOptionalSessionToken } from '@/features/auth/server'
import {
  getCreatorPostPage,
  getCreatorProfile,
  getCreatorTiers,
} from '@/features/creator-page/api/creator-page-api'
import { creatorIdSchema } from '@/features/creator-page/schemas/creator-page'
import type {
  CreatorPostPage,
  CreatorProfile,
  CreatorTier,
} from '@/features/creator-page/types/creator-page'
import { loadExploreCategories } from '@/features/explore/server'
import { publicPageAddress } from '@/features/dashboard'
import { ApiError } from '@/lib/api/errors'
import { env } from '@/lib/env'

/**
 * Who is looking, for the action row only. `owner` is a display choice: the
 * backend still refuses self-follow and self-purchase (BE-SUBS-05).
 */
export type CreatorPageViewer = 'anonymous' | 'signedIn' | 'owner'

export type CreatorPageData = {
  profile: CreatorProfile
  /** `null` when the tier list could not be read: only that tab degrades. */
  tiers: CreatorTier[] | null
  /**
   * The first page of the public list (Q-51); the rest loads on demand.
   * `null` when it could not be read: only that tab degrades.
   */
  posts: CreatorPostPage | null
  categoryTitle: string | null
  viewer: CreatorPageViewer
  /**
   * The page's absolute address to copy (`NEXT_PUBLIC_APP_URL` +
   * `/creators/:id`); `null` when the origin is not configured.
   */
  pageUrl: string | null
}

const isNotFound = (error: unknown) =>
  error instanceof ApiError && error.status === 404

/**
 * Everything `/creators/:id` renders, read in parallel. The cookie's token is
 * sent with the profile read; the backend decides whether it is valid: no
 * `viewer` in its answer means anonymous, whatever the cookie claimed. `null`
 * for an id that is not canonical or a creator the backend does not publish
 * (404); any other failure propagates to the route's error boundary.
 */
export async function loadCreatorPage(
  rawId: string
): Promise<CreatorPageData | null> {
  const id = creatorIdSchema.safeParse(rawId)
  if (!id.success) return null

  const session = await readOptionalSessionToken().catch(() => null)
  try {
    const [profile, tiers, posts, categories] = await Promise.all([
      getCreatorProfile(id.data, session?.token),
      getCreatorTiers(id.data).catch((error: unknown) => {
        if (isNotFound(error)) throw error
        return null
      }),
      getCreatorPostPage(id.data, 1).catch((error: unknown) => {
        if (isNotFound(error)) throw error
        return null
      }),
      loadExploreCategories(),
    ])
    return {
      profile,
      tiers,
      posts,
      categoryTitle:
        categories.find((c) => c.id === profile.categoryId)?.title ?? null,
      pageUrl: publicPageAddress(env.NEXT_PUBLIC_APP_URL, profile.id).url,
      viewer:
        profile.viewerFollows === null || !session
          ? 'anonymous'
          : session.userId === profile.id
            ? 'owner'
            : 'signedIn',
    }
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}
