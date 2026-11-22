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
 * Where "View my page" goes (owner decision 2026-11-22): `/creator`, the
 * owner's own page, which previews an unpublished page and shows a published
 * one. No item at all without an address (no alias, so no page yet).
 */
export function ownPageHref(user: {
  alias: string | null
}): string | undefined {
  return user.alias === null ? undefined : '/creator'
}
