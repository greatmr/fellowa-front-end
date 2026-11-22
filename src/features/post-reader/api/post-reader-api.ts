import 'server-only'

import { parseReaderPost } from '@/features/post-reader/schemas/reader-post'
import { apiGet, withBearer } from '@/lib/api/client'

/**
 * The anonymous read (Q-51): the visitor's view whatever token is sent, so
 * none is. 404 `CONTENT_NOT_FOUND` for anything a visitor may not know of.
 */
export async function getPublicPost(id: number) {
  return parseReaderPost(await apiGet<unknown>(`/landing/posts/${id}`))
}

/**
 * The signed-in read, decided for the token's account (BE-CONT-02). 401
 * without a valid token; 404, never 403, for a draft or an unknown id (Q-09).
 */
export async function getViewerPost(id: number, token: string) {
  return parseReaderPost(
    await apiGet<unknown>(`/content/${id}`, withBearer(token))
  )
}
