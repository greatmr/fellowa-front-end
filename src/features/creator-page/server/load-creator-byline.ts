import 'server-only'

import { getCreatorProfile } from '@/features/creator-page/api/creator-page-api'
import type { CreatorProfile } from '@/features/creator-page/types/creator-page'

/** What a byline shows of a creator page: its public name and avatar. */
export type CreatorByline = Pick<
  CreatorProfile,
  'id' | 'pageName' | 'alias' | 'avatarUrl'
>

/**
 * The byline other public surfaces show for a creator (the post reader,
 * BE-CONT-13), from the public profile read `/creators/:id` already makes
 * (`GET /landing/creators/:id`), sent without a token: a byline does not
 * depend on who is looking. Decoration only, so any failure is `null` and the
 * caller renders without it.
 */
export async function loadCreatorByline(
  id: number
): Promise<CreatorByline | null> {
  try {
    const profile = await getCreatorProfile(id)
    return {
      id: profile.id,
      pageName: profile.pageName,
      alias: profile.alias,
      avatarUrl: profile.avatarUrl,
    }
  } catch {
    return null
  }
}
