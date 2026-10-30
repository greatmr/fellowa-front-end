import type { ReactNode } from 'react'

import { SetupChecklist } from '@/features/studio/components/setup-checklist'
import type { SetupFacts } from '@/features/studio/types/dashboard'

/**
 * Creator studio dashboard (FE-STUDIO-01; CP-01, CP-04). An account with no
 * page yet sees the checklist and no empty metric cards; earnings, audience
 * and post cards arrive with the tasks that own their data.
 */
export function StudioDashboard({
  viewerId,
  facts,
  heading,
}: {
  viewerId: number
  facts: SetupFacts
  heading: ReactNode
}) {
  return (
    <div className="grid max-w-3xl gap-6">
      {heading}
      <SetupChecklist viewerId={viewerId} facts={facts} />
    </div>
  )
}
