import { LockIcon } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'

import { RichBody } from '@/components/common/rich-body'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { OpenTabButton } from '@/features/creator-page/components/creator-tabs'
import type { CreatorPost } from '@/features/creator-page/types/creator-page'
import { Link } from '@/i18n/navigation'

export type PostAuthor = {
  name: string
  initial: string
  avatarUrl: string | null
}

/**
 * One post of the public list (presentation `CreatorProfileView` free card
 * :870-921 and locked card :923-1029 @ d843c3b). It renders exactly the level
 * the server named and the keys that level carries: FULL its body, PARTIAL
 * the opening the server cut, TEASER the owner's preview; both gated levels
 * fade it and show the gate, whose only action opens the Tiers tab (no
 * single-post purchase, FQ-31). The title leads to the post page, where a
 * signed-in member reads it in full (FE-CONT-01). Not ported: the tier name
 * and price on the gate (no post response names a tier), likes, comments and
 * share (not in the contract).
 */
export function CreatorPostCard({
  post,
  creatorId,
  author,
}: {
  post: CreatorPost
  creatorId: number
  author: PostAuthor
}) {
  const t = useTranslations('creatorPage.posts')
  const format = useFormatter()
  const href = `/creators/${creatorId}/posts/${post.id}`
  const gated = post.access !== 'FULL'
  // TEASER: the owner's typed preview, plain text. FULL and PARTIAL: the
  // body as the server sent it (PARTIAL already cut at the paywall).
  const shown =
    post.access === 'TEASER'
      ? post.textPreview
        ? { format: 'plain' as const, text: post.textPreview }
        : null
      : post.body

  return (
    <Card
      className={
        gated
          ? 'gap-0 overflow-hidden border-violet-500/20 p-0'
          : 'gap-0 overflow-hidden p-0'
      }
    >
      <div className="flex items-center gap-3 px-5 pt-5">
        <Avatar className="size-10 ring-2 ring-border">
          {author.avatarUrl ? (
            <AvatarImage src={author.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback className="text-label font-bold">
            {author.initial}
          </AvatarFallback>
        </Avatar>
        <div className="grid min-w-0">
          <b className="truncate text-label font-bold text-foreground">
            <bdi>{author.name}</bdi>
          </b>
          <time
            dateTime={post.createdAt}
            className="text-label text-muted-foreground"
          >
            {format.dateTime(new Date(post.createdAt), { dateStyle: 'medium' })}
          </time>
        </div>
        {gated ? (
          <Badge variant="violet" className="ms-auto">
            <LockIcon aria-hidden />
            {t('membersBadge')}
          </Badge>
        ) : (
          <Badge variant="money" className="ms-auto">
            {t('freeBadge')}
          </Badge>
        )}
      </div>

      <h2
        dir="auto"
        className="mt-4 px-5 text-subtitle font-bold text-foreground"
      >
        <Link
          href={href}
          className="rounded-md hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {post.title}
        </Link>
      </h2>

      {shown ? (
        <div className={gated ? 'mt-2 teaser-fade px-5' : 'mt-2 px-5 pb-5'}>
          <RichBody
            body={shown}
            // Headings in a card preview read at body size: the card's title
            // is the heading that matters here.
            className="line-clamp-6 text-body leading-7 text-muted-foreground [&_h2]:mt-2 [&_h2]:text-body [&_h3]:mt-2 [&_h3]:text-body"
          />
        </div>
      ) : gated ? null : (
        <div className="pb-5" />
      )}

      {gated ? (
        <section
          aria-label={t('gateTitle')}
          className="m-5 mt-2 grid gap-3.5 rounded-md border border-violet-200 bg-violet-50/60 p-5 dark:border-violet-500/20 dark:bg-violet-500/10"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white">
              <LockIcon aria-hidden className="size-3.5" />
            </span>
            <p className="text-label font-bold text-violet-900 dark:text-violet-200">
              {t('gateTitle')}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <OpenTabButton tab="tiers">{t('seeTiers')}</OpenTabButton>
            <Button asChild variant="ghost">
              <Link href={href}>{t('openPost')}</Link>
            </Button>
          </div>
        </section>
      ) : null}
    </Card>
  )
}
