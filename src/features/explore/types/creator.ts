/**
 * Explore card model, mapped from the backend's public projection
 * (`GET /landing/creators{,/top}`, BE-LAND-06; `PublicProfile` in
 * back-end/src/modules/user/user-projections.ts). Only what the card shows.
 * No display name or member count exists in the contract yet.
 */
export type ExploreCreator = {
  id: number
  alias: string | null
  avatarUrl: string | null
  coverUrl: string | null
  bio: string | null
  categoryId: number | null
  /** Only on the ranked (`/top`) list. */
  followerCount: number | null
}

export type ExploreCreatorPage = {
  items: ExploreCreator[]
  total: number
  nextPage: number | null
}

/** `GET /landing/categories` (BE-LAND-07): public, `[{id, title}]`. */
export type ExploreCategory = {
  id: number
  title: string
}

export type ExploreQuery = {
  /** Alias search; empty means the ranked list. */
  alias: string
  /** BE-LAND-08 filter; `null` means every category. */
  categoryId: number | null
  page: number
}
