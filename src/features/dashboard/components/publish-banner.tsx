import { ExternalLinkIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { PublishButton } from '@/features/dashboard/components/publish-button'
import {
  publishBlockedBy,
  publishBlockedMessageKey,
} from '@/features/dashboard/lib/setup-steps'
import type { SetupFacts } from '@/features/dashboard/types/dashboard'
import { Link } from '@/i18n/navigation'

/**
 * Publish-status banner (presentation `DashboardView` :275-307 @ d843c3b): a
 * full-width band with a bottom border, its content in the dashboard column.
 * Unpublished: the publish action, held back with its reason until the page
 * has a username and a tier (CP-05), with the address step (FE-ONB-02,
 * FQ-20) offered when the username is missing. Published: the public page
 * (`/creators/:id`, C-9), as designed. Must sit inside `PublishPageProvider`.
 */
export function PublishBanner({
  viewerId,
  facts,
}: {
  viewerId: number
  facts: SetupFacts
}) {
  const t = useTranslations('panel.dashboard')
  const blockedBy = publishBlockedBy(facts)
  const blockedKey = publishBlockedMessageKey(blockedBy)

  return (
    <section
      aria-label={t('banner.label')}
      className="border-b bg-card py-3 shadow-2xs"
    >
      <PageContainer
        width="medium"
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <p className="text-label font-medium text-foreground">
          {facts.isPublished ? t('banner.published') : t('banner.unpublished')}
        </p>
        {facts.isPublished ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/creators/${viewerId}`}>
              <ExternalLinkIcon aria-hidden />
              {t('identity.viewPage')}
            </Link>
          </Button>
        ) : (
          <div className="flex flex-wrap items-start gap-2">
            {blockedBy === 'username' ? (
              <Button asChild size="sm" variant="outline">
                <Link
                  href={{
                    pathname: '/auth/url',
                    query: { returnTo: '/dashboard' },
                  }}
                >
                  {t('chooseUsername')}
                </Link>
              </Button>
            ) : null}
            <PublishButton
              variant="inverse"
              withIcon
              blockedReason={blockedKey ? t(blockedKey) : null}
            />
          </div>
        )}
      </PageContainer>
    </section>
  )
}
