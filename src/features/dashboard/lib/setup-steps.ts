import type {
  RecentPostsResult,
  SetupFacts,
  SetupStep,
} from '@/features/dashboard/types/dashboard'

/**
 * The five steps and whether each is done, derived from real rows — never a
 * stored progress counter (CP-04). Step 1 is "profile photo and cover", as the
 * design has it. A step whose data could not be read is not ticked.
 */
export function deriveSetupSteps(facts: SetupFacts): SetupStep[] {
  return [
    { id: 'profile', done: facts.hasProfileImages },
    { id: 'firstTier', done: facts.hasTier },
    { id: 'firstPost', done: facts.hasPost === true },
    { id: 'payout', done: facts.hasPayoutDetails },
    { id: 'publish', done: facts.isPublished },
  ]
}

/**
 * "Publish your first post": a published post, not a draft (a draft reads
 * `visibility.datePublished: null`). `null` when the posts could not be read.
 */
export function hasPublishedPost(result: RecentPostsResult): boolean | null {
  return result.ok
    ? result.posts.some((post) => post.publishedAt !== null)
    : null
}

/**
 * A page needs a username and something to sell before it goes live (CP-05).
 * This only decides whether the button is offered; the backend still answers
 * for the publish itself (400 `USER_ALIAS_REQUIRED` without a username).
 */
export function publishBlockedBy(
  facts: SetupFacts
): 'username' | 'firstTier' | null {
  if (facts.username === null) return 'username'
  if (!facts.hasTier) return 'firstTier'
  return null
}

/**
 * The `studio.dashboard` message saying why publish is held back, shared by
 * the banner and the checklist's publish row.
 */
export function publishBlockedMessageKey(
  blockedBy: ReturnType<typeof publishBlockedBy>
): 'publishNeedsUsername' | 'publishNeedsTier' | null {
  if (blockedBy === 'username') return 'publishNeedsUsername'
  if (blockedBy === 'firstTier') return 'publishNeedsTier'
  return null
}
