const privatePaths = new Set([
  '/studio',
  '/studio/posts',
  '/studio/posts/new',
  '/studio/audience',
  '/studio/tiers',
  '/studio/page',
  '/studio/payouts',
  '/onboarding',
  '/memberships',
  '/settings',
  '/feed',
  '/chats',
  '/notifications',
])

/**
 * A public creator page (FE-PAGE-01): signing in from a profile returns to
 * it. Exactly `/creators/<positive integer>` — no query, fragment or segment.
 */
const creatorPagePath = /^\/creators\/[1-9][0-9]{0,9}$/

export type AuthHref =
  string | { pathname: string; query: { returnTo: string } }

/** An auth route link that keeps the post-authentication destination. */
export function authHref(pathname: string, returnTo?: string): AuthHref {
  return returnTo ? { pathname, query: { returnTo } } : pathname
}

/**
 * Only existing private route paths, or a public creator page, can be a
 * post-authentication destination.
 */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string') return '/studio'

  const creatorPage = value.replace(/^\/(?:fa|en)(?=\/)/, '')
  if (creatorPagePath.test(creatorPage)) return creatorPage

  // Do not decode or normalize untrusted input into an accepted URL. Encoded
  // separators, control characters, queries and fragments are all unnecessary.
  if (!/^\/(?:[a-z]+(?:-[a-z]+)?\/)*[a-z]+$/.test(value)) {
    return '/studio'
  }

  const withoutLocale = value.replace(/^\/(?:fa|en)(?=\/)/, '')
  return privatePaths.has(withoutLocale) ? withoutLocale : '/studio'
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
 * than the studio, such as a creator page, goes back there after sign-up and
 * does not choose its own page address first.
 */
export function returnsToPage(returnTo?: string): boolean {
  return returnTo !== undefined && safeReturnTo(returnTo) !== '/studio'
}

/**
 * After the account step, or a Google sign-in: back to the page it started
 * from, or on to the page address step (`/auth/url`). An account that already
 * has a page skips that step. (The prototype sends a new Google account
 * straight to the address step; `POST /auth/google` does not say whether the
 * account is new, so having no page stands in for it.)
 */
export function afterAccountDestination(
  user: { alias: string | null },
  returnTo?: string
): AuthHref {
  return choosesPageAddress(user, returnTo)
    ? authHref('/auth/url', returnTo)
    : safeReturnTo(returnTo)
}

/** Whether the address step follows (and the account step is 1 of 2). */
export function choosesPageAddress(
  user: { alias: string | null },
  returnTo?: string
) {
  return user.alias === null && !returnsToPage(returnTo)
}

/**
 * Where a phone sign-in lands: a new account, or one without a display name,
 * completes its account first (keeping the destination); anyone else goes to
 * the requested page, or the studio.
 */
export function phoneSignInDestination(
  result: { isNewUser: boolean; needsProfile: boolean },
  returnTo?: string
) {
  return result.isNewUser || result.needsProfile
    ? authHref('/auth/account', returnTo)
    : safeReturnTo(returnTo)
}
