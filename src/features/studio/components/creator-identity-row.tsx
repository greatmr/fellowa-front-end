import { ExternalLinkIcon, LayersIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { CreatorIdentity } from '@/features/studio/types/dashboard'
import { Link } from '@/i18n/navigation'

/**
 * The owner's name, avatar and links (presentation `DashboardView` :309-330,
 * :392-416 @ d843c3b). The page is named by its public name, then the
 * owner's own display name (this view is the owner's alone), then `@alias`.
 * The public page (`/creators/:id`, C-9) exists only once published, so the
 * link appears then. Not ported: the collections, shop and recommendations
 * tabs (FQ-27) and the "more settings" button, which has no destination; the
 * membership tab becomes a link to `/studio/tiers` (FQ-27).
 */
export function CreatorIdentityRow({
  viewerId,
  identity,
  isPublished,
}: {
  viewerId: number
  identity: CreatorIdentity
  isPublished: boolean
}) {
  const t = useTranslations('studio.dashboard.identity')
  const name =
    identity.pageName ??
    identity.displayName ??
    (identity.alias ? `@${identity.alias}` : null)
  const shown = name ?? t('unnamed')
  const showAlias = identity.alias !== null && name !== `@${identity.alias}`

  return (
    <section
      aria-labelledby="creator-identity-name"
      className="flex flex-wrap items-center justify-between gap-4"
    >
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className="size-16 ring-2 ring-border">
          {identity.avatarUrl ? (
            <AvatarImage src={identity.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback className="text-subtitle font-bold">
            {(Array.from(shown.replace(/^@/, ''))[0] ?? '').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="grid min-w-0 gap-0.5">
          <h2
            id="creator-identity-name"
            className="truncate text-title font-bold text-foreground"
          >
            <bdi>{shown}</bdi>
          </h2>
          {showAlias ? (
            <p className="text-body-sm text-muted-foreground">
              <bdi dir="ltr">@{identity.alias}</bdi>
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/studio/tiers">
            <LayersIcon aria-hidden />
            {t('memberships')}
          </Link>
        </Button>
        {isPublished ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/creators/${viewerId}`}>
              <ExternalLinkIcon aria-hidden />
              {t('viewPage')}
            </Link>
          </Button>
        ) : null}
      </div>
    </section>
  )
}
