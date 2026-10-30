import 'server-only'

import {
  parseExploreCategories,
  parseExploreCreatorPage,
} from '@/features/explore/schemas/creator'
import type { ExploreQuery } from '@/features/explore/types/creator'
import { apiGet, withBearer } from '@/lib/api/client'

/**
 * Public explore lists (back-end/docs/modules/landing/api.md, BE-LAND-05/06/08).
 * The token is optional: with a valid one the backend leaves the viewer's own
 * page out (BE-LAND-04); without one the list is the anonymous list.
 */
export async function listExploreCreators(
  { alias, categoryId, page }: ExploreQuery,
  token?: string
) {
  const auth = token ? withBearer(token) : {}
  const category = categoryId === null ? {} : { categoryId }
  const response = alias
    ? await apiGet<unknown>('/landing/creators', {
        ...auth,
        params: { alias, ...category, page },
      })
    : await apiGet<unknown>('/landing/creators/top', {
        ...auth,
        params: { ...category, page },
      })
  return parseExploreCreatorPage(response)
}

/** Public category list (BE-LAND-07); no token. */
export async function listExploreCategories() {
  return parseExploreCategories(await apiGet<unknown>('/landing/categories'))
}
