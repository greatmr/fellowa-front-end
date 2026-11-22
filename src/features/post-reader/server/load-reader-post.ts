import 'server-only'

import { readOptionalSessionToken } from '@/features/auth/server'
import {
  type CreatorByline,
  loadCreatorByline,
} from '@/features/creator-page/server'
import {
  getPublicPost,
  getViewerPost,
} from '@/features/post-reader/api/post-reader-api'
import { idParamSchema } from '@/features/post-reader/schemas/reader-post'
import type {
  ReaderPost,
  ReaderViewer,
} from '@/features/post-reader/types/reader-post'
import { ApiError } from '@/lib/api/errors'

export type ReaderPostData = {
  /**
   * The creator from the URL, for the links back to the page and its Tiers
   * tab. Always the post's own `creatorId` (BE-CONT-13): a URL naming
   * another creator is a 404.
   */
  creatorId: number
  post: ReaderPost
  viewer: ReaderViewer
  /** The page's name and avatar; `null` when they could not be read. */
  creator: CreatorByline | null
}

const hasStatus = (error: unknown, status: number) =>
  error instanceof ApiError && error.status === status

/**
 * `/creators/:id/posts/:postId`. With a session cookie the post is read for
 * that account (`GET /content/:id`); a token the backend refuses (401) falls
 * back to the visitor's read, as does no cookie (`GET /landing/posts/:id`).
 * The backend decides the level either way; nothing here does. `null` for a
 * malformed id, a 404 (unknown, draft, removed: DENY) or a post another
 * creator owns; any other failure reaches the route's error boundary. The
 * creator's byline is read beside the post, from the public profile.
 */
export async function loadReaderPost(
  rawCreatorId: string,
  rawPostId: string
): Promise<ReaderPostData | null> {
  const creatorId = idParamSchema.safeParse(rawCreatorId)
  const postId = idParamSchema.safeParse(rawPostId)
  if (!creatorId.success || !postId.success) return null

  const session = await readOptionalSessionToken().catch(() => null)
  const [read, creator] = await Promise.all([
    readPost(postId.data, session?.token),
    loadCreatorByline(creatorId.data),
  ])
  // One post, one URL: a creator id that does not own the post is not found,
  // so a crafted URL cannot put another creator's name or Tiers tab on it.
  if (!read || read.post.creatorId !== creatorId.data) return null
  return { creatorId: creatorId.data, ...read, creator }
}

async function readPost(
  postId: number,
  token: string | undefined
): Promise<{ post: ReaderPost; viewer: ReaderViewer } | null> {
  try {
    if (token) {
      try {
        return { post: await getViewerPost(postId, token), viewer: 'signedIn' }
      } catch (error) {
        if (!hasStatus(error, 401)) throw error
      }
    }
    return { post: await getPublicPost(postId), viewer: 'anonymous' }
  } catch (error) {
    if (hasStatus(error, 404)) return null
    throw error
  }
}
