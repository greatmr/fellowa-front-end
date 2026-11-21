import { useTranslations } from 'next-intl'

import { StudioPage } from '@/components/layout/studio-page'
import type { CreatorIdentity } from '@/features/studio/types/dashboard'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/**
 * The owner's identity band (presentation `DashboardView` :309-388 @
 * d843c3b): a full-width band with the page's name centred and the tabs
 * centred under it. The page is named by its public name, then the owner's
 * own display name (this view is the owner's alone), then `@alias`. Tabs:
 * home (this page) and memberships, a link to `/studio/tiers` (FQ-27); the
 * collections, shop and recommendations tabs are not ported (FQ-27). No
 * avatar: the design has none (FQ-29 default).
 */
export function CreatorIdentityRow({
  identity,
}: {
  identity: CreatorIdentity
}) {
  const t = useTranslations('studio.dashboard.identity')
  const name =
    identity.pageName ??
    identity.displayName ??
    (identity.alias ? `@${identity.alias}` : null)
  const showAlias = identity.alias !== null && name !== `@${identity.alias}`

  return (
    <section
      aria-labelledby="creator-identity-name"
      className="border-b bg-card pt-8 text-center"
    >
      <StudioPage width="medium">
        <h2
          id="creator-identity-name"
          className="text-headline font-bold tracking-tight break-words text-foreground sm:text-display"
        >
          <bdi>{name ?? t('unnamed')}</bdi>
        </h2>
        {showAlias ? (
          <p className="mt-1 text-body-sm text-muted-foreground">
            <bdi dir="ltr">@{identity.alias}</bdi>
          </p>
        ) : null}
        <nav
          aria-label={t('tabsLabel')}
          className="mt-5 flex items-center justify-center gap-6 overflow-x-auto text-body sm:gap-8"
        >
          <Link href="/studio" aria-current="page" className={tabClass(true)}>
            {t('home')}
          </Link>
          <Link href="/studio/tiers" className={tabClass(false)}>
            {t('memberships')}
          </Link>
        </nav>
      </StudioPage>
    </section>
  )
}

function tabClass(active: boolean) {
  return cn(
    'border-b-2 pb-1.5 whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
    active
      ? 'border-primary font-semibold text-primary'
      : 'border-transparent text-muted-foreground hover:text-foreground'
  )
}
