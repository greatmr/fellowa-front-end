/**
 * Retired routes kept as redirects, because links elsewhere still use them
 * (`/auth/login?returnTo=/creators/7`). Next.js passes the query through, so
 * `returnTo` and `reason` survive. Imported by `next.config.ts`: no `@/` alias.
 *
 * - FE-AUTH-04: sign-in and sign-up are one phone-first flow at `/auth`. The
 *   email screens below the old entries (`/auth/login/email`, …) are not
 *   matched.
 * - FE-ONB-02 (FQ-20): the old onboarding (name → username → socials) is
 *   retired; choosing the page's username is the address step, `/auth/url`.
 *   Its old `step` query is passed along and ignored.
 */
const LEGACY_ROUTES = [
  ['/auth/login', '/auth'],
  ['/auth/register', '/auth'],
  ['/onboarding', '/auth/url'],
] as const

export function legacyAuthRedirects() {
  return LEGACY_ROUTES.flatMap(([path, destination]) => [
    { source: path, destination, permanent: false },
    {
      source: `/:locale(fa|en)${path}`,
      destination: `/:locale${destination}`,
      permanent: false,
    },
  ])
}
