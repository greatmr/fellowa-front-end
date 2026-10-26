const privatePaths = new Set([
  '/studio',
  '/studio/posts',
  '/studio/posts/new',
  '/studio/audience',
  '/studio/tiers',
  '/studio/page',
  '/studio/payouts',
  '/memberships',
  '/settings',
  '/feed',
  '/chats',
  '/notifications',
])

/** Only existing private route paths can be a post-authentication destination. */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string') return '/studio'

  // Do not decode or normalize untrusted input into an accepted URL. Encoded
  // separators, control characters, queries and fragments are all unnecessary.
  if (!/^\/(?:[a-z]+(?:-[a-z]+)?\/)*[a-z]+$/.test(value)) {
    return '/studio'
  }

  const withoutLocale = value.replace(/^\/(?:fa|en)(?=\/)/, '')
  return privatePaths.has(withoutLocale) ? withoutLocale : '/studio'
}
