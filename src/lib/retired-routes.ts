/**
 * FE-SHELL-05: the creator's pages left the old `/studio` prefix (there is one
 * account type and no mode, so no URL names one). The old addresses redirect
 * permanently, in both locale forms, so bookmarks and shared links still land.
 * The query passes through (Next.js keeps it). Imported by `next.config.ts`:
 * no `@/` alias.
 *
 * `/studio/page` was a placeholder for "View my page"; that link now opens the
 * creator's own `/creators/:id`, which a static redirect cannot know, so the
 * old address goes to the dashboard (it shows the public address).
 */
const RETIRED_PANEL_ROUTES = [
  ['/studio', '/dashboard'],
  ['/studio/page', '/dashboard'],
  ['/studio/posts', '/posts'],
  ['/studio/posts/new', '/posts/new'],
  ['/studio/posts/:postId/edit', '/posts/:postId/edit'],
  ['/studio/tiers', '/tiers'],
  ['/studio/audience', '/audience'],
  ['/studio/payouts', '/payouts'],
] as const

export function retiredPanelRedirects() {
  return RETIRED_PANEL_ROUTES.flatMap(([path, destination]) => [
    { source: path, destination, permanent: true },
    {
      source: `/:locale(fa|en)${path}`,
      destination: `/:locale${destination}`,
      permanent: true,
    },
  ])
}

const staticRoutes = new Map<string, string>(
  RETIRED_PANEL_ROUTES.filter(([path]) => !path.includes(':'))
)

/**
 * The current address for a retired static path (`/studio/tiers` → `/tiers`),
 * for a destination saved before the move (a `returnTo` mid sign-in);
 * `undefined` for any other path.
 */
export function currentPanelPath(path: string): string | undefined {
  return staticRoutes.get(path)
}
