import { SquarePenIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { StudioPage } from '@/components/layout/studio-page'
import { Button } from '@/components/ui/button'
import { CreatorIdentityRow } from '@/features/studio/components/creator-identity-row'
import { PublicAddressRow } from '@/features/studio/components/public-address-row'
import { PublishBanner } from '@/features/studio/components/publish-banner'
import { PublishPageProvider } from '@/features/studio/components/publish-page-provider'
import { RecentPosts } from '@/features/studio/components/recent-posts'
import { SetupChecklist } from '@/features/studio/components/setup-checklist'
import { publicPageAddress } from '@/features/studio/lib/public-address'
import type { DashboardData } from '@/features/studio/server/load-dashboard'
import { Link } from '@/i18n/navigation'
import { env } from '@/lib/env'

/**
 * Creator studio dashboard, home tab (FE-STUDIO-01/02/03; CP-01, CP-04;
 * presentation `DashboardView` @ d843c3b): the publish banner and identity
 * band at full width, then the dashboard column (the medium page width):
 * the heading with "edit page", the public address, the setup checklist and
 * recent posts. The banner and the checklist share one publish action. No
 * earnings or audience cards: the design has none, and nothing here computes
 * money. Out (FQ-27, FQ-2/FQ-3): the other tabs, the "more" button, post
 * search, likes and comments, the stream overlay and the goal card.
 */
export function StudioDashboard({
  viewerId,
  facts,
  identity,
  recentPosts,
  heading,
}: DashboardData & { heading: ReactNode }) {
  const t = useTranslations('studio.dashboard')
  const address = publicPageAddress(env.NEXT_PUBLIC_APP_URL, viewerId)

  return (
    <PublishPageProvider viewerId={viewerId}>
      <div className="grid gap-8">
        <div>
          <PublishBanner viewerId={viewerId} facts={facts} />
          <CreatorIdentityRow identity={identity} />
        </div>
        <StudioPage width="medium" className="grid gap-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {heading}
            {/* No page editor yet: settings holds the name, photo and cover
                (same rule as the checklist's first step). */}
            <Button asChild size="sm" variant="outline">
              <Link href="/settings">
                <SquarePenIcon aria-hidden />
                {t('editPage')}
              </Link>
            </Button>
          </div>
          <PublicAddressRow
            path={address.path}
            url={address.url}
            isPublished={facts.isPublished}
          />
          <SetupChecklist facts={facts} />
          <RecentPosts result={recentPosts} />
        </StudioPage>
      </div>
    </PublishPageProvider>
  )
}
