import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { PublishButton } from '@/features/studio/components/publish-button'
import { publishBlockedBy } from '@/features/studio/lib/setup-steps'
import type { SetupFacts } from '@/features/studio/types/dashboard'
import { Link } from '@/i18n/navigation'

/**
 * Publish-status banner (presentation `DashboardView` :275-307 @ d843c3b).
 * Unpublished: the publish action, held back with its reason until the page
 * has a username and a tier (CP-05), with the address step (FE-ONB-02,
 * FQ-20) offered when the username is missing. This is the dashboard's one
 * publish action. Published: the status only — the public
 * page link sits in the identity row below, so it is not offered twice.
 */
export function PublishBanner({
  viewerId,
  facts,
}: {
  viewerId: number
  facts: SetupFacts
}) {
  const t = useTranslations('studio.dashboard')
  const blockedBy = publishBlockedBy(facts)

  return (
    <section
      aria-label={t('banner.label')}
      className="flex flex-wrap items-center justify-between gap-4 rounded-md border bg-card px-5 py-3 shadow-2xs"
    >
      <p className="text-label font-medium text-foreground">
        {facts.isPublished ? t('banner.published') : t('banner.unpublished')}
      </p>
      {facts.isPublished ? null : (
        <div className="flex flex-wrap items-start gap-2">
          {blockedBy === 'username' ? (
            <Button asChild size="sm" variant="outline">
              <Link
                href={{ pathname: '/auth/url', query: { returnTo: '/studio' } }}
              >
                {t('chooseUsername')}
              </Link>
            </Button>
          ) : null}
          <PublishButton
            viewerId={viewerId}
            variant="inverse"
            withIcon
            blockedReason={
              blockedBy === 'username'
                ? t('publishNeedsUsername')
                : blockedBy === 'firstTier'
                  ? t('publishNeedsTier')
                  : null
            }
          />
        </div>
      )}
    </section>
  )
}
