/**
 * The creator's public page address (C-9: `/creators/:id`; FQ-18 kept
 * `@username` as wording, not as a URL). `url` is absolute, from
 * `NEXT_PUBLIC_APP_URL`; `null` when that is not configured, so nothing
 * relative is ever copied as if it were shareable.
 */
export function publicPageAddress(
  appUrl: string | undefined,
  viewerId: number
): { path: string; url: string | null } {
  const path = `/creators/${viewerId}`
  const origin = appUrl?.trim().replace(/\/+$/, '')
  return { path, url: origin ? `${origin}${path}` : null }
}

/**
 * A post's reader address on the public page (`/creators/:id/posts/:postId`),
 * absolute from the page's own `url`; `null` when that is `null`.
 */
export function postReaderUrl(
  pageUrl: string | null,
  postId: number
): string | null {
  return pageUrl === null ? null : `${pageUrl}/posts/${postId}`
}

/**
 * Where "View my page" goes (owner option a, 2026-11-22): the public page
 * only once it is published, since the backend answers 404 for an
 * unpublished one; the dashboard, where publishing is offered, until then.
 * No item at all without an address (no alias, so no page yet).
 */
export function ownPageHref(user: {
  id: number
  alias: string | null
  isPublish?: boolean
}): string | undefined {
  if (user.alias === null) return undefined
  return user.isPublish === true
    ? publicPageAddress(undefined, user.id).path
    : '/dashboard'
}
