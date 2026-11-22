'use client'

import { FileTextIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCreatorPostsQuery } from '@/features/creator-page/api/creator-page-hooks'
import {
  CreatorPostCard,
  type PostAuthor,
} from '@/features/creator-page/components/creator-post-card'
import type {
  CreatorPost,
  CreatorPostPage,
} from '@/features/creator-page/types/creator-page'

const filters = ['all', 'free', 'members'] as const
type PostFilter = (typeof filters)[number]

/**
 * The filter reads only the level the server sent for each loaded post:
 * FULL is free for everyone, PARTIAL and TEASER are for members. It never
 * decides access; it only narrows what is already on screen.
 */
function matches(post: CreatorPost, filter: PostFilter) {
  if (filter === 'free') return post.access === 'FULL'
  if (filter === 'members') return post.access !== 'FULL'
  return true
}

/**
 * The Posts tab (presentation `CreatorProfileView` :792-1029 @ d843c3b) over
 * `GET /landing/creators/:id/posts` (Q-51), page by page. The filter works on
 * the posts loaded so far, and says so when it finds none while more remain.
 */
export function CreatorPostList({
  creatorId,
  firstPage,
  author,
}: {
  creatorId: number
  firstPage: CreatorPostPage
  author: PostAuthor
}) {
  const t = useTranslations('creatorPage')
  const [filter, setFilter] = useState<PostFilter>('all')
  const query = useCreatorPostsQuery(creatorId, firstPage)

  // Offset pages: a post published between two reads repeats one (kept
  // once here); one removed between reads is skipped until the next refetch.
  const posts = [
    ...new Map(
      (query.data?.pages ?? [firstPage])
        .flatMap((page) => page.items)
        .map((post) => [post.id, post])
    ).values(),
  ]
  const shown = posts.filter((post) => matches(post, filter))

  if (posts.length === 0 && !query.hasNextPage) {
    return <EmptyState icon={<FileTextIcon />} title={t('emptyPosts')} />
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label={t('posts.filterLabel')}
          className="flex items-center gap-1.5 rounded-md bg-muted p-1"
        >
          {filters.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className="rounded-md px-3 py-1 text-label font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs motion-reduce:transition-none"
            >
              {t(`posts.${key}`)}
            </button>
          ))}
        </div>
        <span aria-live="polite" className="text-label text-muted-foreground">
          {t('posts.showing', { count: shown.length, loaded: posts.length })}
        </span>
      </div>

      {shown.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <FileTextIcon
            aria-hidden
            className="size-10 text-muted-foreground"
            strokeWidth={1.5}
          />
          <p className="text-body font-semibold text-foreground">
            {t('posts.emptyFilter')}
          </p>
          <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
            {t('posts.showAll')}
          </Button>
        </Card>
      ) : (
        <ul className="grid gap-6">
          {shown.map((post) => (
            <li key={post.id}>
              <CreatorPostCard
                post={post}
                creatorId={creatorId}
                author={author}
              />
            </li>
          ))}
        </ul>
      )}

      {query.isFetchNextPageError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-center gap-3 text-body-sm text-muted-foreground"
        >
          {t('posts.loadFailed')}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.fetchNextPage()}
          >
            {t('posts.retry')}
          </Button>
        </div>
      ) : query.hasNextPage ? (
        <Button
          variant="outline"
          className="justify-self-center"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage
            ? t('posts.loadingMore')
            : t('posts.loadMore')}
        </Button>
      ) : null}
    </div>
  )
}
