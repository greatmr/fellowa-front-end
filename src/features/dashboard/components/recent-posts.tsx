import {
  FileTextIcon,
  GlobeIcon,
  LockIcon,
  LockOpenIcon,
  SquarePenIcon,
} from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RefreshButton } from '@/features/dashboard/components/refresh-button'
import type { RecentPostsResult } from '@/features/dashboard/types/dashboard'
import { Link } from '@/i18n/navigation'

/** How many of the newest posts the dashboard lists. */
export const RECENT_POSTS_LIMIT = 5

/**
 * Recent posts (presentation `DashboardView` :824-900 @ d843c3b): title,
 * date, a two-line excerpt of the body (`text`, FE-STUDIO-03), draft and
 * audience badges, and the "create post" dark button. Every
 * row is the owner's own post at FULL (`GET /content`); the badge shows the
 * audience the owner chose (`visibility.type`, `paywallPosition`); it
 * decides no access. Loading is the route's (`[locale]/loading.tsx`): the
 * posts are read with the rest of the dashboard.
 * Not ported (FQ-27): search and filters, the inline like button, the comment
 * box, share and stats. No like or comment counts: `GET /content` carries none.
 */
export function RecentPosts({ result }: { result: RecentPostsResult }) {
  const t = useTranslations('panel.dashboard.posts')
  const format = useFormatter()

  let body: ReactNode
  if (!result.ok) {
    body = (
      <ErrorState
        title={t('errorTitle')}
        description={t('errorBody')}
        action={<RefreshButton label={t('retry')} />}
      />
    )
  } else if (result.posts.length === 0) {
    body = (
      <EmptyState
        icon={<FileTextIcon />}
        title={t('emptyTitle')}
        description={t('emptyBody')}
      />
    )
  } else {
    const shown = result.posts.slice(0, RECENT_POSTS_LIMIT)
    body = (
      <>
        <ul className="grid gap-3">
          {shown.map((post) => {
            const date = post.publishedAt ?? post.createdAt
            return (
              <li key={post.id}>
                <Card className="gap-3 p-6">
                  <div className="grid gap-1">
                    <h3
                      dir="auto"
                      className="text-subtitle font-bold text-foreground"
                    >
                      {post.title}
                    </h3>
                    <p className="text-label text-muted-foreground">
                      <time dateTime={date}>
                        {format.dateTime(new Date(date), {
                          dateStyle: 'medium',
                        })}
                      </time>
                    </p>
                  </div>
                  {post.excerpt ? (
                    <p
                      dir="auto"
                      className="line-clamp-2 text-body text-muted-foreground"
                    >
                      {post.excerpt}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    {post.publishedAt === null ? (
                      <Badge variant="neutral">{t('draft')}</Badge>
                    ) : null}
                    {post.audience === 'public' ? (
                      <Badge variant="neutral">
                        <GlobeIcon aria-hidden />
                        {t('public')}
                      </Badge>
                    ) : post.audience === 'paywalled' ? (
                      <Badge variant="amber">
                        <LockOpenIcon aria-hidden />
                        {t('paywalled')}
                      </Badge>
                    ) : (
                      <Badge variant="amber">
                        <LockIcon aria-hidden />
                        {t('locked')}
                      </Badge>
                    )}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
        {result.posts.length > shown.length ? (
          <Button
            asChild
            size="sm"
            variant="link"
            className="justify-self-start"
          >
            <Link href="/posts">{t('seeAll')}</Link>
          </Button>
        ) : null}
      </>
    )
  }

  return (
    <section aria-labelledby="recent-posts-title" className="grid gap-4">
      <RecentPostsHeader />
      {body}
    </section>
  )
}

function RecentPostsHeader() {
  const t = useTranslations('panel.dashboard.posts')
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2
        id="recent-posts-title"
        className="text-subtitle font-bold text-foreground"
      >
        {t('title')}
      </h2>
      <Button asChild size="sm" variant="inverse">
        <Link href="/posts/new">
          <SquarePenIcon aria-hidden />
          {t('create')}
        </Link>
      </Button>
    </div>
  )
}
