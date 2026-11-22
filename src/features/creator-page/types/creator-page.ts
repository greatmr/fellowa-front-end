import type { PostBody } from '@/lib/post-body'

/**
 * Public creator page (FE-PAGE-01/03), from `GET /landing/creators/:id{,/tiers,
 * /posts}` (BE-LAND-03, Q-51; back-end/docs/modules/landing/api.md). Only what
 * the page shows. No member count or seats left exist yet.
 */
export type CreatorProfile = {
  id: number
  alias: string | null
  /**
   * BE-USER-07 (FQ-17): the page's public name; `null` until the owner gives
   * one, and then the page shows `@alias`. Never the private `displayName`.
   */
  pageName: string | null
  avatarUrl: string | null
  coverUrl: string | null
  bio: string | null
  categoryId: number | null
  followerCount: number
  links: CreatorLink[]
  /**
   * BE-LAND-09: whether the token's account follows this creator; `null`
   * when the backend saw no valid token — then the visitor is anonymous.
   */
  viewerFollows: boolean | null
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

/**
 * One post of the creator's public list (`GET /landing/creators/:id/posts`,
 * Q-51), as an anonymous visitor may see it, whoever is looking (FQ-33 A).
 * The backend decides the level and sends only that level's keys; each
 * variant holds only those, so nothing gated travels past the parse.
 */
export type CreatorPost =
  FullCreatorPost | PartialCreatorPost | TeaserCreatorPost

type CreatorPostBase = {
  id: number
  title: string
  createdAt: string
}

export type FullCreatorPost = CreatorPostBase & {
  access: 'FULL'
  /** `text` in its `bodyFormat` (Q-83); `null` without a body. */
  body: PostBody | null
}

export type PartialCreatorPost = CreatorPostBase & {
  access: 'PARTIAL'
  /**
   * The opening up to the paywall, cut on the server (whole blocks for
   * `html`); `null` at position 0.
   */
  body: PostBody | null
}

export type TeaserCreatorPost = CreatorPostBase & {
  access: 'TEASER'
  /** What the owner typed as a preview, never made from the body. */
  textPreview: string | null
}

/** One page of the list; `total` counts every published post. */
export type CreatorPostPage = {
  items: CreatorPost[]
  total: number
  nextPage: number | null
}

/**
 * A collection on the public page (`GET /landing/creators/:id/collections`,
 * BE-CONT-15, FQ-35). `postCount` counts only what the public list shows
 * (published, not future-dated), so it equals that collection's `total`.
 */
export type CreatorCollection = {
  id: number
  title: string
  description: string | null
  postCount: number
}
