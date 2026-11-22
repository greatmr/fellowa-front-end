'use client'

import { useId, useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  useAssignCollectionsMutation,
  useCollectionsQuery,
  useCreateCollectionMutation,
  useSetPostCollectionsMutation,
} from '@/features/posts/api/post-hooks'
import { NO_PAGE, postErrorKey } from '@/features/posts/lib/post-errors'
import {
  MAX_COLLECTION_IDS,
  MAX_COLLECTION_TITLE,
} from '@/features/posts/schemas/collection'
import type { OwnerPost } from '@/features/posts/types/post'
import type { ApiError } from '@/lib/api/errors'

/**
 * `replace`: one post's collections, exactly (the row cell). `add`: the
 * selected posts go into every collection ticked, nothing is removed (the
 * bulk bar).
 */
export type AssignTarget =
  { mode: 'replace'; post: OwnerPost } | { mode: 'add'; posts: OwnerPost[] }

type Props = {
  viewerId: number
  open: boolean
  target: AssignTarget
  onClose: () => void
  /** Bulk add went through for these posts. */
  onAdded?: (postIds: number[]) => void
  onNoPage: () => void
}

/**
 * "Add to collection" (presentation `PostsView` :890-985 @ d843c3b) with
 * inline create. Mount with a fresh `key` per opening. Replace sends
 * `PUT /content/:id/collections`; add sends `POST /content/collections/assign`
 * (BE-CONT-15).
 */
export function AssignCollectionsDialog({
  viewerId,
  open,
  target,
  onClose,
  onAdded,
  onNoPage,
}: Props) {
  const t = useTranslations('posts.collections.assign')
  const tCollections = useTranslations('posts.collections')
  const tErrors = useTranslations('posts.errors')
  const tList = useTranslations('posts.list')
  const tCommon = useTranslations('common')
  const ids = useId()
  const collections = useCollectionsQuery(viewerId)
  const create = useCreateCollectionMutation(viewerId)
  const replace = useSetPostCollectionsMutation(viewerId)
  const assign = useAssignCollectionsMutation(viewerId)
  const [picked, setPicked] = useState<number[]>(() =>
    target.mode === 'replace' ? target.post.collectionIds : []
  )
  const [newTitle, setNewTitle] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const saving = replace.isPending || assign.isPending
  const pending = saving || create.isPending

  const subtitle =
    target.mode === 'replace'
      ? target.post.title || tList('untitled')
      : t('selected', { count: target.posts.length })

  function errorLine(failure: ApiError): string | null {
    if (failure.code === NO_PAGE) {
      onNoPage()
      onClose()
      return null
    }
    return tErrors(postErrorKey(failure))
  }

  function toggle(collectionId: number, checked: boolean) {
    setPicked((current) =>
      checked
        ? [...current, collectionId]
        : current.filter((id) => id !== collectionId)
    )
    setError(null)
  }

  function createInline() {
    const title = newTitle.trim()
    if (!title || pending) return
    setCreateError(null)
    create.mutate(
      { title, description: null },
      {
        onSuccess: (collection) => {
          setPicked((current) => [...current, collection.id])
          setNewTitle('')
          toast.success(t('createdToast', { title: collection.title }))
        },
        onError: (failure) =>
          setCreateError(
            failure.code === 'CONTENT_COLLECTION_TITLE_TAKEN'
              ? tErrors('collectionTitleTaken')
              : errorLine(failure)
          ),
      }
    )
  }

  function save() {
    if (pending) return
    // Only collections that still exist: one deleted meanwhile would 404.
    const known = new Set(collections.data?.map((c) => c.id) ?? [])
    const chosen = [...new Set(picked)].filter((id) => known.has(id))
    if (chosen.length > MAX_COLLECTION_IDS) {
      setError(t('tooMany', { max: MAX_COLLECTION_IDS }))
      return
    }
    if (target.mode === 'replace') {
      replace.mutate(
        { postId: target.post.id, collectionIds: chosen },
        {
          onSuccess: () => {
            toast.success(t('replacedToast'))
            onClose()
          },
          onError: (failure) => setError(errorLine(failure)),
        }
      )
      return
    }
    if (chosen.length === 0) {
      setError(t('pickOne'))
      return
    }
    const postIds = target.posts.map((post) => post.id)
    assign.mutate(
      { postIds, collectionIds: chosen },
      {
        onSuccess: () => {
          toast.success(t('addedToast'))
          onAdded?.(postIds)
          onClose()
        },
        onError: (failure) => setError(errorLine(failure)),
      }
    )
  }

  let list
  if (collections.data === undefined) {
    list = collections.isError ? (
      <div role="alert" className="grid justify-items-center gap-2 py-4">
        <p className="text-label text-muted-foreground">
          {tCollections('loadError')}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void collections.refetch()}
        >
          {tCommon('retry')}
        </Button>
      </div>
    ) : (
      <p
        role="status"
        className="py-4 text-center text-label text-muted-foreground"
      >
        {tCollections('loading')}
      </p>
    )
  } else if (collections.data.length === 0) {
    list = (
      <p className="rounded-md border border-dashed px-4 py-6 text-center text-label text-muted-foreground">
        {t('empty')}
      </p>
    )
  } else {
    list = (
      <ul
        aria-label={t('listLabel')}
        className="max-h-60 divide-y overflow-y-auto rounded-md border"
      >
        {collections.data.map((collection) => {
          const id = `${ids}-c-${collection.id}`
          return (
            <li
              key={collection.id}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-muted/60"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Checkbox
                  id={id}
                  checked={picked.includes(collection.id)}
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
              </div>
              <span className="shrink-0 text-caption text-muted-foreground">
                {tCollections('postCount', { count: collection.postCount })}
              </span>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) onClose()
      }}
    >
      <DialogContent closeLabel={tCommon('close')} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription dir="auto" className="truncate">
            {subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <div className="flex items-center gap-2">
            <Input
              value={newTitle}
              maxLength={MAX_COLLECTION_TITLE}
              aria-label={t('newLabel')}
              placeholder={t('newPlaceholder')}
              aria-invalid={createError ? true : undefined}
              onChange={(event) => {
                setNewTitle(event.target.value)
                setCreateError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  createInline()
                }
              }}
            />
            <Button
              type="button"
              variant="inverse"
              disabled={!newTitle.trim() || pending}
              onClick={createInline}
            >
              <Plus aria-hidden />
              {create.isPending ? t('creating') : t('create')}
            </Button>
          </div>
          {createError ? (
            <p role="alert" className="text-label text-destructive">
              {createError}
            </p>
          ) : null}
        </div>

        {list}

        {error ? (
          <p role="alert" className="text-body-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onClose}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="button"
            disabled={pending || collections.data === undefined}
            onClick={save}
          >
            {saving ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
