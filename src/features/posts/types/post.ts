/**
 * The owner's own posts, as `GET /content`, `GET /content/:id` and every
 * write route return them (`content-format.ts` `formatForOwner`, back-end
 * `acffdb2`). Only the keys the studio reads.
 */

/** A stored image or attachment: `{id, url}`; `url` is `null` when unusable. */
export type PostFile = { id: number; url: string | null }

export type StudioPost = {
  id: number
  /**
   * Derived by the server from what the post holds: `text`, `image`, `video`,
   * `audio`, `link` or `poll` (`content-type.ts`). Kept as the server's word.
   */
  type: string
  title: string
  /** `text`, plain; `''` when the post has no body. */
  text: string
  /** `visibility.type`: `true` is public, `false` is limited to tiers. */
  isPublic: boolean
  /** `visibility.datePublished`; `null` is a draft (api.md → "Drafts"). */
  publishedAt: string | null
  createdAt: string
  /** Code points of `text` readable before the paywall; `null` for none. */
  paywallPosition: number | null
  /** `visibility.textPreview`, resent on every write so it is not cleared. */
  textPreview: string | null
  /** `visibility.dateEarly`, resent on every write so it is not cleared. */
  dateEarly: string | null
  images: PostFile[]
  attachments: PostFile[]
}

/**
 * `VisibilityOptionDto`. A PUT replaces the last one, so `textPreview` and
 * `dateEarly` are resent; `datePublished` keeps a published post's date.
 */
export type PostVisibilityPayload = {
  type: boolean
  isDraft?: boolean
  datePublished?: string
  textPreview?: string
  earlyAccess?: boolean
  dateEarly?: string
}

/** `CreateTextContentDto` / `CreateImageContentDto` (also their PUT). */
export type PostWritePayload = {
  title: string
  text: string
  /** Always sent with `text`, so Q-50 never refuses an edit. */
  paywallPosition: number | null
  /** Left out: the tier links stay as they are (PUT). */
  tireIds?: number[]
  visibility: PostVisibilityPayload
  /** Image posts only. */
  imageIds?: number[]
}

/** Which create/update route a write goes to. */
export type PostWriteKind = 'text' | 'image'

export type SavePostInput = {
  /** Left out: create. */
  postId?: number
  kind: PostWriteKind
  payload: PostWritePayload
}

/** `PUT /content/text/:id` with the title and a new visibility only. */
export type PostStatusInput = {
  postId: number
  title: string
  visibility: PostVisibilityPayload
}
