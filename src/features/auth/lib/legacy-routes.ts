/**
 * FE-AUTH-04: sign-in and sign-up are one phone-first flow at `/auth`. The old
 * entry routes stay as redirects, because links elsewhere use them
 * (`/auth/login?returnTo=/creators/7`). Next.js passes the query through, so
 * `returnTo` and `reason` survive. Imported by `next.config.ts`: no `@/` alias.
 * The email screens below them (`/auth/login/email`, …) are not matched.
 */
const LEGACY_ENTRIES = ['/auth/login', '/auth/register'] as const

export function legacyAuthRedirects() {
  return LEGACY_ENTRIES.flatMap((path) => [
    { source: path, destination: '/auth', permanent: false },
    {
      source: `/:locale(fa|en)${path}`,
      destination: '/:locale/auth',
      permanent: false,
    },
  ])
}
