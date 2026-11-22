/**
 * Where the creator page's client lists read from, and where its posts link
 * to. Plain values, outside the `'use client'` modules, so the server view can
 * pass them as props (`test/rsc-boundary.test.ts`).
 *
 * - `public`: `/landing/creators/:id/…`, no token (`/creators/:id`).
 * - `ownPage`: `/landing/me/page/…` with the session's token, the owner's
 *   preview at `/creator` (BE-LAND-10), published or not.
 */
export type CreatorListSource = 'public' | 'ownPage'

/**
 * - `reader`: the public post page, `/creators/:id/posts/:postId`.
 * - `editor`: the owner's editor, `/posts/:postId/edit`, for an unpublished
 *   page, whose public post pages answer 404 and whose reader would link back
 *   to a page that does not exist yet.
 */
export type CreatorPostLink = 'reader' | 'editor'

export function creatorPostHref(
  creatorId: number,
  postId: number,
  link: CreatorPostLink
): string {
  return link === 'editor'
    ? `/posts/${postId}/edit`
    : `/creators/${creatorId}/posts/${postId}`
}
