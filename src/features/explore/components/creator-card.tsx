import { useFormatter, useTranslations } from 'next-intl'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import type { ExploreCreator } from '@/features/explore/types/creator'
import { Link } from '@/i18n/navigation'

/**
 * Explore card (presentation `ExploreView` @ dc8467f). The whole card links
 * to the public creator page, `/creators/:id` (FE-PAGE-01).
 */
export function CreatorCard({
  creator,
  categoryTitle,
}: {
  creator: ExploreCreator
  /** From the public category list (BE-LAND-07); `null` when unknown. */
  categoryTitle: string | null
}) {
  const t = useTranslations('explore')
  const format = useFormatter()
  const name = creator.alias ?? t('unnamed')

  return (
    <Link
      href={`/creators/${creator.id}`}
      className="flex flex-1 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Card interactive className="flex-1 gap-0 overflow-hidden py-0">
        <div
          aria-hidden
          className="h-24 w-full bg-cover-mix bg-cover bg-center"
          style={
            creator.coverUrl
              ? { backgroundImage: `url(${JSON.stringify(creator.coverUrl)})` }
              : undefined
          }
        />
        <div className="-mt-8 flex flex-1 flex-col px-4 pb-4">
          <Avatar className="size-14 bg-card ring-4 ring-card">
            {creator.avatarUrl ? (
              <AvatarImage src={creator.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback className="text-subtitle font-bold">
              {name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h2 className="mt-2 truncate text-subtitle font-bold text-foreground">
            <bdi>{name}</bdi>
          </h2>
          {categoryTitle ? (
            <p className="text-label text-muted-foreground">{categoryTitle}</p>
          ) : null}
          {creator.bio ? (
            <p
              dir="auto"
              className="mt-2 line-clamp-2 text-body-sm leading-6 text-muted-foreground"
            >
              {creator.bio}
            </p>
          ) : null}
          {creator.followerCount !== null ? (
            <p className="mt-3 text-body-sm text-muted-foreground">
              {t.rich('followers', {
                count: creator.followerCount,
                formatted: format.number(creator.followerCount),
                b: (chunks) => (
                  <b className="font-bold text-foreground">{chunks}</b>
                ),
              })}
            </p>
          ) : null}
        </div>
      </Card>
    </Link>
  )
}
