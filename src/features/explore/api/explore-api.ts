import 'server-only'

import { parseExploreCreatorPage } from '@/features/explore/schemas/creator'
import type { ExploreQuery } from '@/features/explore/types/creator'
import { apiGet, withBearer } from '@/lib/api/client'

/**
 * Public explore lists (back-end/docs/modules/landing/api.md, BE-LAND-05/06).
 * The token is optional: with a valid one the backend leaves the viewer's own
 * page out (BE-LAND-04); without one the list is the anonymous list.
 */
export async function listExploreCreators(
  { alias, page }: ExploreQuery,
  token?: string
) {
  const auth = token ? withBearer(token) : {}
  const response = alias
    ? await apiGet<unknown>('/landing/creators', {
        ...auth,
        params: { alias, page },
      })
    : await apiGet<unknown>('/landing/creators/top', {
        ...auth,
        params: { page },
      })
  return parseExploreCreatorPage(response)
}
