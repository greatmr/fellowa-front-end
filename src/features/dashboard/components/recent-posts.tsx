import { FileTextIcon, SquarePenIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Button } from '@/components/ui/button'
import { RecentPostsFeed } from '@/features/dashboard/components/recent-posts-feed'
import { RefreshButton } from '@/features/dashboard/components/refresh-button'
import type { RecentPostsResult } from '@/features/dashboard/types/dashboard'
import { Link } from '@/i18n/navigation'

/**
 * Recent posts (presentation `DashboardView` :824-979 @ d843c3b; FE-STUDIO-02,
 * FE-STUDIO-03, FE-DASH-04): the heading with "create post", then the
 * toolbar and the feed (`RecentPostsFeed`), or the section's own empty and
 * error states. Every row is the owner's own post at FULL (`GET /content`).
 * Loading is the route's (`[locale]/loading.tsx`): the posts are read with
 * the rest of the dashboard. Every post goes to the feed, whole, because the
 * toolbar searches and filters all of them on the client (`GET /content` is
 * not paginated); the cost is page size, never exposure: these are the
 * owner's own posts. Out: likes, comments, repost, stats, "more" and
 * the comment box (no contract; comment rendering is deferred).
 */
export function RecentPosts({
  result,
  pageUrl,
  isPublished,
}: {
  result: RecentPostsResult
  /** The public page's absolute address; `null` without an app origin. */
  pageUrl: string | null
  isPublished: boolean
}) {
  const t = useTranslations('panel.dashboard.posts')

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
    body = (
      <RecentPostsFeed
        posts={result.posts}
        pageUrl={pageUrl}
        isPublished={isPublished}
      />
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
        className="text-title-sm font-bold text-foreground"
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
