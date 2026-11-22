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
