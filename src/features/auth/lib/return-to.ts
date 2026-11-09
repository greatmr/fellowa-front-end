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

/** An auth route link that keeps the post-authentication destination. */
export function authHref(pathname: string, returnTo?: string) {
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
 * Where a phone sign-in lands: a new account, or one without a display name,
 * completes its account first (then the creator onboarding); anyone else goes
 * to the requested page, or the studio.
 */
export function phoneSignInDestination(
  result: { isNewUser: boolean; needsProfile: boolean },
  returnTo?: string
) {
  return result.isNewUser || result.needsProfile
    ? '/auth/account'
    : safeReturnTo(returnTo)
}
