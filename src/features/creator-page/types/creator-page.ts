/**
 * Public creator page (FE-PAGE-01), from `GET /landing/creators/:id{,/tiers,
 * /content}` (BE-LAND-03; back-end/docs/modules/landing/api.md). Only what the
 * page shows. No display name, member count or seats left exist yet.
 */
export type CreatorProfile = {
  id: number
  alias: string | null
  avatarUrl: string | null
  coverUrl: string | null
  bio: string | null
  categoryId: number | null
  followerCount: number
  links: CreatorLink[]
}

export type CreatorLink = {
  kind: 'video' | 'instagram' | 'twitter' | 'youtube' | 'facebook'
  url: string
}

export type CreatorTier = {
  id: number
  title: string
  description: string | null
  /** Integer Toman as stored by the backend; display only. */
  priceToman: number
  coverUrl: string | null
  benefits: { id: number; title: string }[]
}

/** A post an anonymous visitor may read in full (access `FULL`). */
export type CreatorPost = {
  id: number
  title: string
  text: string | null
  tags: string[]
  createdAt: string
}
