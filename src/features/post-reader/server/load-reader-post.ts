import 'server-only'

import { readOptionalSessionToken } from '@/features/auth/server'
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
   * tab. Neither post response names its page, so this is not checked
   * against the post.
   */
  creatorId: number
  post: ReaderPost
  viewer: ReaderViewer
}

const hasStatus = (error: unknown, status: number) =>
  error instanceof ApiError && error.status === status

/**
 * `/creators/:id/posts/:postId`. With a session cookie the post is read for
 * that account (`GET /content/:id`); a token the backend refuses (401) falls
 * back to the visitor's read, as does no cookie (`GET /landing/posts/:id`).
 * The backend decides the level either way; nothing here does. `null` for a
 * malformed id or a 404 (unknown, draft, removed: DENY); any other failure
 * reaches the route's error boundary.
 */
export async function loadReaderPost(
  rawCreatorId: string,
  rawPostId: string
): Promise<ReaderPostData | null> {
  const creatorId = idParamSchema.safeParse(rawCreatorId)
  const postId = idParamSchema.safeParse(rawPostId)
  if (!creatorId.success || !postId.success) return null

  const session = await readOptionalSessionToken().catch(() => null)
  try {
    if (session) {
      try {
        return {
          creatorId: creatorId.data,
          post: await getViewerPost(postId.data, session.token),
          viewer: 'signedIn',
        }
      } catch (error) {
        if (!hasStatus(error, 401)) throw error
      }
    }
    return {
      creatorId: creatorId.data,
      post: await getPublicPost(postId.data),
      viewer: 'anonymous',
    }
  } catch (error) {
    if (hasStatus(error, 404)) return null
    throw error
  }
}
