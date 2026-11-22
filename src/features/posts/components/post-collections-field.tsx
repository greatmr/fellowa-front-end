'use client'

import { useId, useState } from 'react'
import { FolderPlus, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  useCollectionsQuery,
  useCreateCollectionMutation,
} from '@/features/posts/api/post-hooks'
import { NO_PAGE, postErrorKey } from '@/features/posts/lib/post-errors'
import { MAX_COLLECTION_TITLE } from '@/features/posts/schemas/collection'

type Props = {
  viewerId: number
  /** The collections ticked for this post. */
  value: number[]
  /** An updater: a quick create resolves after other ticks may have changed. */
  onChange: (update: (current: number[]) => number[]) => void
  onNoPage: () => void
}

/**
 * The composer's collections (presentation `ComposerView` :511-582 @
 * d843c3b): tick one or more, or create one on the spot (it is ticked). The
 * choice is sent after the post saves, with `PUT /content/:id/collections`
 * (create and update take no `collectionIds`, BE-CONT-15).
 */
export function PostCollectionsField({
  viewerId,
  value,
  onChange,
  onNoPage,
}: Props) {
  const t = useTranslations('posts.composer.collections')
  const tErrors = useTranslations('posts.errors')
  const tCommon = useTranslations('common')
  const ids = useId()
  const collections = useCollectionsQuery(viewerId)
  const create = useCreateCollectionMutation(viewerId)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  function toggle(collectionId: number, checked: boolean) {
    onChange((current) =>
      checked
        ? [...current, collectionId]
        : current.filter((id) => id !== collectionId)
    )
  }

  function quickCreate() {
    const trimmed = title.trim()
    if (!trimmed || create.isPending) return
    setError(null)
    create.mutate(
      { title: trimmed, description: null },
      {
        onSuccess: (collection) => {
          onChange((current) => [...current, collection.id])
          setTitle('')
          setAdding(false)
        },
        onError: (failure) => {
          if (failure.code === NO_PAGE) onNoPage()
          else if (failure.code === 'CONTENT_COLLECTION_TITLE_TAKEN')
            setError(tErrors('collectionTitleTaken'))
          else setError(tErrors(postErrorKey(failure)))
        },
      }
    )
  }

  let list
  if (collections.data === undefined) {
    list = collections.isError ? (
      <div role="alert" className="mt-2.5 flex items-center gap-2 text-label">
        <span className="text-muted-foreground">{t('loadError')}</span>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0"
          onClick={() => void collections.refetch()}
        >
          {tCommon('retry')}
        </Button>
      </div>
    ) : (
      <p role="status" className="mt-2.5 text-label text-muted-foreground">
        {t('loading')}
      </p>
    )
  } else if (collections.data.length > 0) {
    list = (
      <ul
        aria-label={t('listLabel')}
        className="mt-2.5 grid max-h-40 gap-2 overflow-y-auto rounded-md border bg-muted/50 p-3"
      >
        {collections.data.map((collection) => {
          const id = `${ids}-c-${collection.id}`
          return (
            <li key={collection.id} className="flex items-center gap-2.5">
              <Checkbox
                id={id}
                checked={value.includes(collection.id)}
                onCheckedChange={(checked) =>
                  toggle(collection.id, checked === true)
                }
              />
              <label
                htmlFor={id}
                dir="auto"
                className="cursor-pointer truncate text-label text-foreground"
              >
                {collection.title}
              </label>
            </li>
          )
        })}
      </ul>
    )
  } else if (!adding) {
    list = (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed py-2.5 text-label font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <FolderPlus aria-hidden className="size-3.5" />
        {t('createFirst')}
      </button>
    )
  }

  return (
    <section aria-labelledby={`${ids}-title`} className="border-t pt-4">
      <div className="flex items-center justify-between gap-2">
        <h2
          id={`${ids}-title`}
          className="text-body font-semibold text-foreground"
        >
          {t('title')}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={adding}
          className="h-auto px-2 py-1"
          onClick={() => setAdding((open) => !open)}
        >
          <Plus aria-hidden className="size-3.5" />
          {t('new')}
        </Button>
      </div>
      <p className="mt-1 text-label leading-5 text-muted-foreground">
        {t('hint')}
      </p>
      {adding ? (
        <div className="mt-2.5 grid gap-1.5">
          <div className="flex items-center gap-1.5">
            <Input
              value={title}
              maxLength={MAX_COLLECTION_TITLE}
              aria-label={t('newLabel')}
              placeholder={t('newPlaceholder')}
              aria-invalid={error ? true : undefined}
              className="h-9 min-w-0 flex-1 text-label"
              onChange={(event) => {
                setTitle(event.target.value)
                setError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  quickCreate()
                }
              }}
            />
            <Button
              type="button"
              variant="inverse"
              size="sm"
              disabled={!title.trim() || create.isPending}
              onClick={quickCreate}
            >
              {create.isPending ? t('adding') : t('add')}
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-label text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
      {list}
    </section>
  )
}
