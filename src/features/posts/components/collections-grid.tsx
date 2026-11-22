'use client'

import {
  FolderOpen,
  FolderPlus,
  Layers,
  Plus,
  SquarePen,
  Trash2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { OwnerCollection } from '@/features/posts/types/collection'
import { Link } from '@/i18n/navigation'

type Props = {
  collections: OwnerCollection[] | undefined
  loadFailed: boolean
  onRetry: () => void
  /** The owner has no post yet: the empty state also offers the first one. */
  noPosts: boolean
  busy: boolean
  onCreate: () => void
  onEdit: (collection: OwnerCollection) => void
  onDelete: (collection: OwnerCollection) => void
  onView: (collection: OwnerCollection) => void
}

/**
 * The collections tab (presentation `PostsView` :382-484 @ d843c3b): one
 * card per collection with its post count (drafts included, BE-CONT-15),
 * edit, delete, manage posts and view posts; the empty state offers the
 * first one.
 */
export function CollectionsGrid({
  collections,
  loadFailed,
  onRetry,
  noPosts,
  busy,
  onCreate,
  onEdit,
  onDelete,
  onView,
}: Props) {
  const t = useTranslations('posts.collections')
  const tCommon = useTranslations('common')

  if (collections === undefined) {
    return loadFailed ? (
      <ErrorState
        title={t('loadError')}
        action={
          <Button type="button" onClick={onRetry}>
            {tCommon('retry')}
          </Button>
        }
      />
    ) : (
      <p role="status" className="py-12 text-center text-muted-foreground">
        {t('loading')}
      </p>
    )
  }

  if (collections.length === 0) {
    return (
      <EmptyState
        icon={<Layers />}
        title={t('empty.title')}
        description={t('empty.body')}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Button type="button" onClick={onCreate}>
              <FolderPlus aria-hidden />
              {t('empty.create')}
            </Button>
            {noPosts ? (
              <Button asChild variant="outline">
                <Link href="/posts/new">
                  <SquarePen aria-hidden />
                  {t('empty.createPost')}
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((collection) => (
        <li key={collection.id} className="flex">
          <Card className="flex-1 justify-between gap-0 p-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/70 text-muted-foreground"
                >
                  <FolderOpen className="size-5" strokeWidth={1.7} />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy}
                    aria-label={t('editNamed', { title: collection.title })}
                    title={t('editNamed', { title: collection.title })}
                    onClick={() => onEdit(collection)}
                  >
                    <SquarePen aria-hidden className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy}
                    aria-label={t('deleteNamed', { title: collection.title })}
                    title={t('deleteNamed', { title: collection.title })}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(collection)}
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h3
                    dir="auto"
                    className="truncate text-body font-semibold text-foreground"
                  >
                    {collection.title}
                  </h3>
                  <Badge variant="neutral">
                    {t('postCount', { count: collection.postCount })}
                  </Badge>
                </div>
                <p
                  dir="auto"
                  className="mt-1.5 line-clamp-2 text-label leading-5 text-muted-foreground"
                >
                  {collection.description || t('noDescription')}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3.5">
              <Button
                type="button"
                variant="inverse"
                size="sm"
                className="flex-1"
                disabled={busy}
                onClick={() => onEdit(collection)}
              >
                <Plus aria-hidden className="size-3.5" />
                {t('managePosts')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onView(collection)}
              >
                {t('viewPosts')}
              </Button>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}
