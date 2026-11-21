import { codePointLength, splitAtCodePoint } from '@/features/posts/lib/paywall'
import type {
  PostFile,
  PostStatusInput,
  PostVisibilityPayload,
  SavePostInput,
  StudioPost,
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

export type PostDraft = {
  title: string
  /** The body, or the part before the paywall divider. */
  before: string
  /** The part after the divider; `null` when there is no divider. */
  after: string | null
  access: 'free' | 'tiers'
  tiers: TierSelection
  images: DraftImage[]
}

export type SaveIntent = 'publish' | 'draft'
export type DraftProblem = 'title' | 'tiers'

/** The composer edits text and image posts; other types are FE-POST-02. */
export function isEditableType(type: string): boolean {
  return type === 'text' || type === 'image'
}

export function emptyPostDraft(): PostDraft {
  return {
    title: '',
    before: '',
    after: null,
    access: 'free',
    tiers: { mode: 'pick', ids: [] },
    images: [],
  }
}

export function draftFromPost(post: StudioPost): PostDraft {
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
  return problems
}

export function postText(draft: PostDraft): string {
  return draft.before + (draft.after ?? '')
}

export function paywallPositionOf(draft: PostDraft): number | null {
  return draft.after === null ? null : codePointLength(draft.before)
}

/**
 * The visibility a write sends. A PUT replaces the stored one, so the preview
 * and early-access date the studio does not edit are resent, and a published
 * post keeps its date (no date would publish it again "now").
 */
export function visibilityFor(
  isPublic: boolean,
  intent: SaveIntent,
  saved: StudioPost | null
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

export function saveInputFromDraft(
  draft: PostDraft,
  intent: SaveIntent,
  saved: StudioPost | null
): SavePostInput {
  const kind =
    draft.images.length > 0 || saved?.type === 'image' ? 'image' : 'text'
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
      ...(kind === 'image'
        ? { imageIds: draft.images.map((image) => image.id) }
        : {}),
    },
  }
}

/**
 * A row's publish or unpublish: the same PUT with only the title and a new
 * visibility, so the body, tiers, paywall and media stay as they are.
 */
export function statusInput(
  post: StudioPost,
  intent: SaveIntent
): PostStatusInput {
  return {
    postId: post.id,
    title: post.title,
    visibility: visibilityFor(post.isPublic, intent, post),
  }
}
