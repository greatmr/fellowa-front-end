import type { ReactNode } from 'react'

import { CreatorIdentityRow } from '@/features/studio/components/creator-identity-row'
import { PublishBanner } from '@/features/studio/components/publish-banner'
import { RecentPosts } from '@/features/studio/components/recent-posts'
import { SetupChecklist } from '@/features/studio/components/setup-checklist'
import type { DashboardData } from '@/features/studio/server/load-dashboard'

/**
 * Creator studio dashboard, home tab (FE-STUDIO-01/02; CP-01, CP-04;
 * presentation `DashboardView` @ d843c3b): publish banner, identity row,
 * setup checklist and recent posts. No earnings or audience cards: the design
 * has none, and nothing here computes money. Out (FQ-27, FQ-2/FQ-3): the
 * other tabs, post search, likes and comments, the stream overlay and the
 * goal card.
 */
export function StudioDashboard({
  viewerId,
  facts,
  identity,
  recentPosts,
  heading,
}: DashboardData & { heading: ReactNode }) {
  return (
    <div className="grid gap-6">
      {heading}
      <PublishBanner viewerId={viewerId} facts={facts} />
      <CreatorIdentityRow
        viewerId={viewerId}
        identity={identity}
        isPublished={facts.isPublished}
      />
      <SetupChecklist facts={facts} />
      <RecentPosts result={recentPosts} />
    </div>
  )
}
