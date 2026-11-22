import { currentPanelPath } from '@/lib/retired-routes'

const privatePaths = new Set([
  '/dashboard',
  '/posts',
  '/posts/new',
  '/audience',
  '/tiers',
  '/payouts',
  '/memberships',
  '/settings',
  '/feed',
  '/chats',
  '/notifications',
])

/**
 * A public creator page (FE-PAGE-01) or one of its posts (FE-CONT-01):
 * signing in from either returns to it. Exactly `/creators/<positive
 * integer>`, optionally `/posts/<positive integer>` — no query, fragment or
 * other segment.
 */
const creatorPagePath =
  /^\/creators\/[1-9][0-9]{0,9}(?:\/posts\/[1-9][0-9]{0,9})?$/

export type AuthHref =
  string | { pathname: string; query: Record<string, string> }

/**
 * An auth route link that keeps the post-authentication destination, with
 * any step `query` of its own (the address step's return mode, FE-AUTH-08).
 */
export function authHref(
  pathname: string,
  returnTo?: string,
  query: Record<string, string> = {}
): AuthHref {
  const merged = returnTo ? { ...query, returnTo } : query
  return Object.keys(merged).length > 0 ? { pathname, query: merged } : pathname
}

/**
 * Only existing private route paths, or a public creator page, can be a
 * post-authentication destination.
 */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string') return '/dashboard'

  const creatorPage = value.replace(/^\/(?:fa|en)(?=\/)/, '')
  if (creatorPagePath.test(creatorPage)) return creatorPage

  // Do not decode or normalize untrusted input into an accepted URL. Encoded
  // separators, control characters, queries and fragments are all unnecessary.
  if (!/^\/(?:[a-z]+(?:-[a-z]+)?\/)*[a-z]+$/.test(value)) {
    return '/dashboard'
  }

  const withoutLocale = value.replace(/^\/(?:fa|en)(?=\/)/, '')
  // A destination saved before FE-SHELL-05 (`/studio/tiers`) maps to its
  // current address.
  const current = currentPanelPath(withoutLocale) ?? withoutLocale
  return privatePaths.has(current) ? current : '/dashboard'
}

/**
 * The destination a request asked for, made safe; `undefined` when it asked
 * for none, so links between the auth steps do not invent one.
 */
export function requestedReturnTo(value: unknown): string | undefined {
  return typeof value === 'string' ? safeReturnTo(value) : undefined
}

/**
 * FQ-17 ("Back to the page"): an account that started from somewhere other
 * than the dashboard, such as a creator page, goes back there after sign-up and
 * does not choose its own page address first.
 */
export function returnsToPage(returnTo?: string): boolean {
  return returnTo !== undefined && safeReturnTo(returnTo) !== '/dashboard'
}

/**
 * After the account step: back to the page it started from, or on to the page
 * address step (`/auth/url`). An account that already has a page skips that
 * step. Sign-up reaches the address step only when there is no page to return
 * to, so its destination is the default and travels no further: a `returnTo`
 * on `/auth/url` means it was opened from elsewhere (`addressStepStandsAlone`).
 */
export function afterAccountDestination(
  user: { alias: string | null },
  returnTo?: string
): AuthHref {
  return choosesPageAddress(user, returnTo)
    ? '/auth/url'
    : safeReturnTo(returnTo)
}

/**
 * FE-ONB-02: the address step opened from a page rather than from sign-up
 * (settings' "no page" link → `/settings`, the dashboard checklist → `/dashboard`).
 * It then shows no step count, and "back" and "done" both return there.
 */
export function addressStepStandsAlone(returnTo?: string): boolean {
  return returnTo !== undefined
}

/** Whether the address step follows (and the account step is 1 of 2). */
export function choosesPageAddress(
  user: { alias: string | null },
  returnTo?: string
) {
  return user.alias === null && !returnsToPage(returnTo)
}

/**
 * Where a Google sign-in lands (FE-AUTH-05, FE-AUTH-06, BE-AUTH-10). An
 * account Google gave no usable name (`needsProfile`) completes its account
 * first, as a phone sign-in does. A new account goes on to the page address
 * step, as in the prototype (Google gave the name), or back to the page it
 * started from (FQ-17). A returning account goes to its destination, page or
 * not: the dashboard checklist asks for the address.
 */
export function googleSignInDestination(
  result: { isNewUser: boolean; needsProfile: boolean },
  returnTo?: string
): AuthHref {
  if (result.needsProfile) return authHref('/auth/account', returnTo)
  return result.isNewUser && !returnsToPage(returnTo)
    ? '/auth/url'
    : safeReturnTo(returnTo)
}

/**
 * Where a phone sign-in lands: a new account, or one without a display name,
 * completes its account first (keeping the destination); anyone else goes to
 * the requested page, or the dashboard.
 */
export function phoneSignInDestination(
  result: { isNewUser: boolean; needsProfile: boolean },
  returnTo?: string
) {
  return result.isNewUser || result.needsProfile
    ? authHref('/auth/account', returnTo)
    : safeReturnTo(returnTo)
}
