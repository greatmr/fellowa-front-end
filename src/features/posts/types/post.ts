import type { BodyFormat } from '@/lib/post-body'

/**
 * The owner's own posts, as `GET /content`, `GET /content/:id` and every
 * write route return them (`content-format.ts` `formatForOwner`, back-end
 * `acffdb2`). Only the keys the panel reads.
 */

/** A stored image or attachment: `{id, url}`; `url` is `null` when unusable. */
export type PostFile = { id: number; url: string | null }

export type OwnerPost = {
  id: number
  /**
   * Derived by the server from what the post holds: `text`, `image`, `video`,
   * `audio`, `link` or `poll` (`content-type.ts`). Kept as the server's word.
   */
  type: string
  title: string
  /**
   * `text`: plain text, or the server-sanitised HTML of an `html` body
   * (BE-CONT-14); `''` when the post has no body. Never rendered as HTML
   * from here: the panel shows `excerpt`.
   */
  text: string
  /** How `text` is written (Q-83). Every post stored before M021 is `plain`. */
  bodyFormat: BodyFormat
  /**
   * The server's plain-text start of the body, at most 200 code points (owner
   * reads only); `null` without a body, or from a server older than BE-CONT-14.
   */
  excerpt: string | null
  /** `visibility.type`: `true` is public, `false` is limited to tiers. */
  isPublic: boolean
  /** `visibility.datePublished`; `null` is a draft (api.md → "Drafts"). */
  publishedAt: string | null
  createdAt: string
  /**
   * Where the paywall is: code points of a `plain` body (Q-19), the index of
   * the first gated top-level block of an `html` one (Q-83); `null` for none.
   */
  paywallPosition: number | null
  /** `visibility.textPreview`, resent on every write so it is not cleared. */
  textPreview: string | null
  /** `visibility.dateEarly`, resent on every write so it is not cleared. */
  dateEarly: string | null
  images: PostFile[]
  attachments: PostFile[]
  /** `videos[]`: Arvan videos on this post (FQ-30: at most one in practice). */
  videos: PostMedia[]
  /** `audios[]`: Arvan audios on this post. */
  audios: PostMedia[]
  /** `polls[0]`; `poll.post_id` is UNIQUE, so a post has at most one. */
  poll: PostPoll | null
  /**
   * The collections this post is in, ascending (BE-CONT-15, owner reads
   * only); `[]` from a server older than BE-CONT-15.
   */
  collectionIds: number[]
}

/**
 * A video or audio on a post: `{id, fileNameCloud}`. No playable URL exists
 * in any response (FE-CONT-01), so the panel shows the name only.
 */
export type PostMedia = { id: number; name: string | null }

export type PostPollOption = { id: number; label: string }

export type PostPoll = {
  /** `typeSelect`: `true` lets a reader choose several options. */
  multiSelect: boolean
  /** `endDataPublished`; votes are refused from then on. */
  closesAt: string | null
  options: PostPollOption[]
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
  /**
   * Always sent: left out, an update keeps the stored format, and the
   * composer writes `html` only (FE-POST-03).
   */
  bodyFormat: BodyFormat
  /**
   * Always sent with `text`, so Q-50 never refuses an edit, nor a format
   * change on a paywalled post (CONTENT_PAYWALL_POSITION_REQUIRED).
   */
  paywallPosition: number | null
  /** Left out: the tier links stay as they are (PUT). */
  tireIds?: number[]
  visibility: PostVisibilityPayload
  /** Image posts only. */
  imageIds?: number[]
  /** Video posts only: a finalized upload's id (`finalize-video`). */
  videoId?: number
  /** Audio posts only: a finalized upload's id (`finalize-audio`). */
  audioId?: number
  /** Poll posts only: every option, as a PUT replaces them all. */
  options?: { option: string }[]
  /** Poll posts only. */
  typeSelect?: boolean
  /** Poll posts only; resent on a PUT, which clears it when left out. */
  endDataPublished?: string
}

/** Which create/update route a write goes to. */
export type PostWriteKind = 'text' | 'image' | 'video' | 'audio' | 'poll'

/** The two kinds that upload through Arvan (`upload/init` … `finalize-*`). */
export type MediaUploadKind = 'video' | 'audio'

/** `POST /content/upload/init`: what the chunks and finalize need. */
export type MediaUploadSession = {
  fileId: string
  uploadUrl: string
  /** Binds the file to this account; held in memory for this upload only. */
  uploadToken: string
}

export type MediaUploadStart = {
  fileName: string
  fileSize: number
  fileType: string
}

export type MediaUploadFinish = {
  kind: MediaUploadKind
  fileId: string
  uploadToken: string
}

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
