import 'server-only'

import { listExploreCategories } from '@/features/explore/api/explore-api'
import type { ExploreCategory } from '@/features/explore/types/creator'

/**
 * Public categories for the explore chips and card labels. Explore still
 * works without them, so a failure renders no chips instead of an error.
 */
export async function loadExploreCategories(): Promise<ExploreCategory[]> {
  try {
    return await listExploreCategories()
  } catch {
    return []
  }
}
