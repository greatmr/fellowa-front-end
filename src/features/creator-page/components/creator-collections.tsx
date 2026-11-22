'use client'

import { ArrowLeft, FileTextIcon, FolderOpen } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCreatorCollectionPostsQuery } from '@/features/creator-page/api/creator-page-hooks'
import {
  CreatorPostCard,
  type PostAuthor,
} from '@/features/creator-page/components/creator-post-card'
import type { CreatorCollection } from '@/features/creator-page/types/creator-page'

/**
 * The Collections tab (BE-CONT-15, FQ-35). A deliberate addition: the
 * prototype's creator page has no collections, so this follows the page's
 * own patterns (FE-PAGE-03): cards to choose one, then its posts as the
 * Posts tab shows them, locked ones locked with the same gate (the server
 * decides TEASER or PARTIAL and sends nothing more), and "load more".
 */
export function CreatorCollections({
  creatorId,
  collections,
  author,
}: {
  creatorId: number
  collections: CreatorCollection[]
  author: PostAuthor
}) {
  const t = useTranslations('creatorPage.collections')
  const format = useFormatter()
  const [openId, setOpenId] = useState<number | null>(null)
  const open = collections.find((c) => c.id === openId)

  if (open) {
    return (
      <CollectionPosts
        creatorId={creatorId}
        collection={open}
        author={author}
        onBack={() => setOpenId(null)}
      />
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {collections.map((collection) => (
        <li key={collection.id} className="flex">
          <Card className="flex-1 gap-0 p-5">
            <div className="flex items-start gap-3">
              <div
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/70 text-muted-foreground"
              >
                <FolderOpen className="size-5" strokeWidth={1.7} />
              </div>
              <div className="grid min-w-0 flex-1 gap-1">
                <h3
                  dir="auto"
                  className="truncate text-body font-bold text-foreground"
                >
                  {collection.title}
                </h3>
                <Badge variant="neutral" className="w-fit">
                  {t('postCount', {
                    count: collection.postCount,
                    formatted: format.number(collection.postCount),
                  })}
                </Badge>
              </div>
            </div>
            {collection.description ? (
              <p
                dir="auto"
                className="mt-3 line-clamp-3 text-label leading-relaxed text-muted-foreground"
              >
                {collection.description}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 self-start"
              aria-label={t('openNamed', { title: collection.title })}
              onClick={() => setOpenId(collection.id)}
            >
              {t('open')}
            </Button>
          </Card>
        </li>
      ))}
    </ul>
  )
}

function CollectionPosts({
  creatorId,
  collection,
  author,
  onBack,
}: {
  creatorId: number
  collection: CreatorCollection
  author: PostAuthor
  onBack: () => void
}) {
  const t = useTranslations('creatorPage.collections')
  const tPosts = useTranslations('creatorPage.posts')
  const query = useCreatorCollectionPostsQuery(creatorId, collection.id)

  // Offset pages: a post repeated across two reads is kept once.
  const posts = [
    ...new Map(
      (query.data?.pages ?? [])
        .flatMap((page) => page.items)
        .map((post) => [post.id, post])
    ).values(),
  ]

  let list
  if (query.data === undefined) {
    list = query.isError ? (
      <ErrorState
        title={t('postsUnavailable')}
        action={
          <Button type="button" onClick={() => void query.refetch()}>
            {tPosts('retry')}
          </Button>
        }
      />
    ) : (
      <p role="status" className="py-12 text-center text-muted-foreground">
        {t('loadingPosts')}
      </p>
    )
  } else if (posts.length === 0) {
    list = <EmptyState icon={<FileTextIcon />} title={t('emptyPosts')} />
  } else {
    list = (
      <>
        <ul className="grid gap-6">
          {posts.map((post) => (
            <li key={post.id}>
              <CreatorPostCard
                post={post}
                creatorId={creatorId}
                author={author}
              />
            </li>
          ))}
        </ul>
        {query.isFetchNextPageError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-center gap-3 text-body-sm text-muted-foreground"
          >
            {tPosts('loadFailed')}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.fetchNextPage()}
            >
              {tPosts('retry')}
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
              ? tPosts('loadingMore')
              : tPosts('loadMore')}
          </Button>
        ) : null}
      </>
    )
  }

  return (
    <section
      aria-labelledby={`collection-${collection.id}`}
      className="grid gap-6"
    >
      <div className="grid gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden className="rtl:rotate-180" />
          {t('back')}
        </Button>
        <h3
          id={`collection-${collection.id}`}
          dir="auto"
          className="text-title-sm font-black text-foreground"
        >
          {collection.title}
        </h3>
        {collection.description ? (
          <p
            dir="auto"
            className="text-label leading-relaxed text-muted-foreground"
          >
            {collection.description}
          </p>
        ) : null}
      </div>
      {list}
    </section>
  )
}
