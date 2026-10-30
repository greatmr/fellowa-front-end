import 'server-only'

import type { AuthSession } from '@/features/auth/server'
import { getSetupFacts } from '@/features/studio/api/dashboard-api'
import type { SetupFacts } from '@/features/studio/types/dashboard'

export type DashboardData = {
  viewerId: number
  facts: SetupFacts
}

/** What `/studio` renders for the signed-in account (FE-STUDIO-01). */
export async function loadDashboard(
  session: AuthSession
): Promise<DashboardData> {
  return {
    viewerId: session.user.id,
    facts: await getSetupFacts(session.token, session.user.id),
  }
}
