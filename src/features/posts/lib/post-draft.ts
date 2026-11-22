import { codePointLength, splitAtCodePoint } from '@/features/posts/lib/paywall'
import type {
  MediaUploadKind,
  PostFile,
  PostMedia,
  PostStatusInput,
  PostVisibilityPayload,
  PostWriteKind,
  PostWritePayload,
  SavePostInput,
  OwnerPost,
} from '@/features/posts/types/post'

/**
 * Tiers a limited post is for. The owner's post read carries no tier ids
 * (`formatForOwner`), so an edit cannot show them: `keep` leaves the links as
 * they are (`tireIds` left out), `pick` replaces them with `ids`.
 */
export type TierSelection = { mode: 'keep' } | { mode: 'pick'; ids: number[] }

export type DraftImage = PostFile & {
  /** Already on this post (a delete is real) or only uploaded (not yet claimed). */
  attached: boolean
}

/** The one media block a post holds (FQ-30: one media type per post). */
export type PostMediaKind = 'image' | MediaUploadKind | 'poll'

export type DraftUpload = PostMedia & {
  /** Already on this post, or finalized and waiting for the save to claim it. */
  attached: boolean
}

export type DraftPoll = {
  /** As typed; blank ones are dropped when saving. */
  options: string[]
  multiSelect: boolean
  /** The stored closing time, resent untouched (the studio does not edit it). */
  closesAt: string | null
}

/** Options a published poll needs ([PROP]: the API takes any number). */
export const MIN_POLL_OPTIONS = 2

export type PostDraft = {
  title: string
  /** The body, or the part before the paywall divider. */
  before: string
  /** The part after the divider; `null` when there is no divider. */
  after: string | null
  access: 'free' | 'tiers'
  tiers: TierSelection
  images: DraftImage[]
  /** `null`: a text post, or a new post whose block is not chosen yet. */
  media: PostMediaKind | null
  /** The video or audio, once finalized. */
  upload: DraftUpload | null
  poll: DraftPoll
}

export type SaveIntent = 'publish' | 'draft'
export type DraftProblem = 'title' | 'tiers' | 'media' | 'poll'

/** Every type the composer writes; `link` has no composer (no design). */
export function isEditableType(type: string): boolean {
  return ['text', 'image', 'video', 'audio', 'poll'].includes(type)
}

function mediaKindOf(type: string): PostMediaKind | null {
  return type === 'image' ||
    type === 'video' ||
    type === 'audio' ||
    type === 'poll'
    ? type
    : null
}

/** The saved video or audio; a post has one (FQ-30), the first is shown. */
export function savedUpload(post: OwnerPost): DraftUpload | null {
  const media = post.type === 'audio' ? post.audios[0] : post.videos[0]
  return media && (post.type === 'video' || post.type === 'audio')
    ? { ...media, attached: true }
    : null
}

export function emptyPoll(): DraftPoll {
  return {
    options: Array.from({ length: MIN_POLL_OPTIONS }, () => ''),
    multiSelect: false,
    closesAt: null,
  }
}

function pollFromPost(post: OwnerPost): DraftPoll {
  if (!post.poll) return emptyPoll()
  const options = post.poll.options.map((option) => option.label)
  // A draft may have been saved with fewer; the editor always shows two.
  while (options.length < MIN_POLL_OPTIONS) options.push('')
  return {
    options,
    multiSelect: post.poll.multiSelect,
    closesAt: post.poll.closesAt,
  }
}

/** The options a save sends: trimmed, blanks dropped. */
export function pollOptionsOf(poll: DraftPoll): string[] {
  return poll.options.map((option) => option.trim()).filter(Boolean)
}

export function emptyPostDraft(): PostDraft {
  return {
    title: '',
    before: '',
    after: null,
    access: 'free',
    tiers: { mode: 'pick', ids: [] },
    images: [],
    media: null,
    upload: null,
    poll: emptyPoll(),
  }
}

export function draftFromPost(post: OwnerPost): PostDraft {
  const parts =
    post.paywallPosition === null
      ? { before: post.text, after: null }
      : splitAtCodePoint(post.text, post.paywallPosition)
  return {
    title: post.title,
    before: parts.before,
    after: parts.after,
    access: post.isPublic ? 'free' : 'tiers',
    tiers: post.isPublic ? { mode: 'pick', ids: [] } : { mode: 'keep' },
    images: post.images.map((image) => ({ ...image, attached: true })),
    media: mediaKindOf(post.type),
    upload: savedUpload(post),
    poll: pollFromPost(post),
  }
}

/**
 * What stops a save, checked first as UX; the server checks again. A draft
 * may wait for its tiers (O-4 applies on publish only).
 */
export function draftProblems(
  draft: PostDraft,
  intent: SaveIntent
): DraftProblem[] {
  const problems: DraftProblem[] = []
  if (!draft.title.trim()) problems.push('title')
  if (
    intent === 'publish' &&
    draft.access === 'tiers' &&
    draft.tiers.mode === 'pick' &&
    draft.tiers.ids.length === 0
  ) {
    problems.push('tiers')
  }
  if (intent === 'publish') {
    if ((draft.media === 'video' || draft.media === 'audio') && !draft.upload)
      problems.push('media')
    if (
      draft.media === 'poll' &&
      pollOptionsOf(draft.poll).length < MIN_POLL_OPTIONS
    )
      problems.push('poll')
  }
  return problems
}

export function postText(draft: PostDraft): string {
  return draft.before + (draft.after ?? '')
}

/**
 * No paywall when nothing but white space follows the divider: a position at
 * the end gates nothing, yet would still mark a public post as paywalled
 * (it then leaves the landing lists, api.md → Q-31).
 */
export function paywallPositionOf(draft: PostDraft): number | null {
  if (draft.after === null || draft.after.trim() === '') return null
  return codePointLength(draft.before)
}

/**
 * The visibility a write sends. A PUT replaces the stored one, so the preview
 * and early-access date the studio does not edit are resent, and a published
 * post keeps its date (no date would publish it again "now").
 */
export function visibilityFor(
  isPublic: boolean,
  intent: SaveIntent,
  saved: OwnerPost | null
): PostVisibilityPayload {
  const visibility: PostVisibilityPayload = { type: isPublic }
  if (intent === 'draft') visibility.isDraft = true
  else if (saved?.publishedAt) visibility.datePublished = saved.publishedAt
  if (saved?.textPreview) visibility.textPreview = saved.textPreview
  if (saved?.dateEarly) {
    visibility.earlyAccess = true
    visibility.dateEarly = saved.dateEarly
  }
  return visibility
}

function tierIdsFor(draft: PostDraft): number[] | undefined {
  // A free post drops its links; they would do nothing (api.md → Mapping).
  if (draft.access === 'free') return []
  return draft.tiers.mode === 'keep' ? undefined : draft.tiers.ids
}

/**
 * The route a save goes to. A post created through a media route with no
 * media yet reads `text` (api.md), so an empty image block saves as text.
 */
function writeKindOf(
  draft: PostDraft,
  saved: OwnerPost | null
): PostWriteKind {
  if (
    draft.media === 'poll' ||
    draft.media === 'video' ||
    draft.media === 'audio'
  )
    return draft.media
  return draft.images.length > 0 || saved?.type === 'image' ? 'image' : 'text'
}

/** The route's own keys (`Create{Image,Video,Audio,Poll}ContentDto`). */
function mediaPayload(
  kind: PostWriteKind,
  draft: PostDraft
): Partial<PostWritePayload> {
  switch (kind) {
    case 'image':
      return { imageIds: draft.images.map((image) => image.id) }
    case 'video':
    case 'audio': {
      // Only a new upload: the route attaches, it never replaces, so resending
      // the saved id would do nothing and a second id would add a second file.
      const upload = draft.upload
      if (!upload || upload.attached) return {}
      return kind === 'video' ? { videoId: upload.id } : { audioId: upload.id }
    }
    case 'poll':
      return {
        options: pollOptionsOf(draft.poll).map((option) => ({ option })),
        typeSelect: draft.poll.multiSelect,
        // A PUT clears the closing time when it is left out.
        ...(draft.poll.closesAt
          ? { endDataPublished: draft.poll.closesAt }
          : {}),
      }
    case 'text':
      return {}
  }
}

export function saveInputFromDraft(
  draft: PostDraft,
  intent: SaveIntent,
  saved: OwnerPost | null
): SavePostInput {
  const kind = writeKindOf(draft, saved)
  const tireIds = tierIdsFor(draft)
  return {
    ...(saved ? { postId: saved.id } : {}),
    kind,
    payload: {
      title: draft.title.trim(),
      text: postText(draft),
      paywallPosition: paywallPositionOf(draft),
      ...(tireIds ? { tireIds } : {}),
      visibility: visibilityFor(draft.access === 'free', intent, saved),
      ...mediaPayload(kind, draft),
    },
  }
}

/**
 * A row's publish or unpublish: the same PUT with only the title and a new
 * visibility, so the body, tiers, paywall and media stay as they are.
 */
export function statusInput(
  post: OwnerPost,
  intent: SaveIntent
): PostStatusInput {
  return {
    postId: post.id,
    title: post.title,
    visibility: visibilityFor(post.isPublic, intent, post),
  }
}
