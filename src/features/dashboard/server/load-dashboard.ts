import 'server-only'

import type { AuthSession } from '@/features/auth/server'
import {
  getDashboardProfile,
  getRecentPosts,
} from '@/features/dashboard/api/dashboard-api'
import { hasPublishedPost } from '@/features/dashboard/lib/setup-steps'
import type {
  CreatorIdentity,
  RecentPostsResult,
  SetupFacts,
} from '@/features/dashboard/types/dashboard'

export type DashboardData = {
  viewerId: number
  facts: SetupFacts
  identity: CreatorIdentity
  /** The posts widget's own outcome: a failed read shows its error state. */
  recentPosts: RecentPostsResult
}

/**
 * What `/studio` renders for the signed-in account (FE-STUDIO-01/02). The
 * profile, tiers and payout reads fail the page as before (route error); a
 * failed `GET /content` stays inside the posts widget and leaves the
 * checklist's "first post" step unticked.
 */
export async function loadDashboard(
  session: AuthSession
): Promise<DashboardData> {
  const [profile, recentPosts] = await Promise.all([
    getDashboardProfile(session.token, session.user.id),
    getRecentPosts(session.token).then(
      (posts): RecentPostsResult => ({ ok: true, posts }),
      (): RecentPostsResult => ({ ok: false })
    ),
  ])
  return {
    viewerId: session.user.id,
    facts: { ...profile.facts, hasPost: hasPublishedPost(recentPosts) },
    identity: profile.identity,
    recentPosts,
  }
}
