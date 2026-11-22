import type { PostBody } from '@/lib/post-body'

/**
 * The five setup steps of CP-04, in the order the checklist shows them
 * (presentation `StudioChecklistCard` @ d843c3b).
 */
export type SetupStepId =
  'profile' | 'firstTier' | 'firstPost' | 'payout' | 'publish'

/**
 * What the dashboard knows about the signed-in creator, read from the backend
 * on every visit. Nothing here is stored or counted on the client.
 */
export type SetupFacts = {
  /** The claimed username (`alias`); `null` until the account sets one. */
  username: string | null
  /** Both a profile photo and a cover are stored (`images.profile`, `images.header`). */
  hasProfileImages: boolean
  hasTier: boolean
  /** A published post exists; `null` when the posts could not be read. */
  hasPost: boolean | null
  hasPayoutDetails: boolean
  isPublished: boolean
}

export type SetupStep = {
  id: SetupStepId
  done: boolean
}

/** The owner's own identity row, from `GET /user/:id/profile`. */
export type CreatorIdentity = {
  /** The page's public name (BE-USER-07); `null` until the owner gives one. */
  pageName: string | null
  /** The account's private display name, shown only to its owner (Q-63). */
  displayName: string | null
  alias: string | null
  /** An absolute http(s) URL, or `null` (none stored, or not a URL). */
  avatarUrl: string | null
}

/**
 * One of the owner's posts on `GET /content`. Only what the list shows: the
 * route carries no like or comment counts, so none are read.
 */
export type DashboardPost = {
  id: number
  title: string
  /**
   * The whole body (`text` with its `bodyFormat`, FE-DASH-04 row 2). The
   * owner reads their own posts at FULL; `null` when there is none.
   */
  body: PostBody | null
  /**
   * The server's plain-text start of the body (BE-CONT-14, owner reads
   * only), trimmed; searched, never shown. `null` when absent.
   */
  excerpt: string | null
  /** `null` for a draft: no route leaves a published post without a date. */
  publishedAt: string | null
  createdAt: string
  /**
   * The audience the owner chose: `visibility.type` true is public, false is
   * limited to tiers; a public post with a `paywallPosition` is public up to
   * the paywall only.
   */
  audience: 'public' | 'paywalled' | 'tiers'
}

/** The recent-posts widget's own outcome, so its failure stays inside it. */
export type RecentPostsResult =
  { ok: true; posts: DashboardPost[] } | { ok: false }
