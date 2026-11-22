'use client'

import { useId, useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
} from '@/features/posts/api/post-hooks'
import { NO_PAGE, postErrorKey } from '@/features/posts/lib/post-errors'
import { isDraft } from '@/features/posts/lib/post-list'
import {
  MAX_COLLECTION_DESCRIPTION,
  MAX_COLLECTION_POSTS,
  MAX_COLLECTION_TITLE,
} from '@/features/posts/schemas/collection'
import type { OwnerCollection } from '@/features/posts/types/collection'
import type { OwnerPost } from '@/features/posts/types/post'
import type { ApiError } from '@/lib/api/errors'

type Props = {
  viewerId: number
  open: boolean
  /** The collection being edited; `null` creates one. */
  collection: OwnerCollection | null
  /** The owner's posts, to pick the collection's set from. */
  posts: OwnerPost[]
  onClose: () => void
  onNoPage: () => void
}

/**
 * The ids of the posts in `collectionId`, from each post's `collectionIds`.
 * `GET /content` lists approved posts only (`content.service.ts`); nothing
 * sets approval today (O-7), so the set is complete. If that changes, an
 * edit that resends the set would unlink an unapproved post.
 */
function postsIn(posts: OwnerPost[], collectionId: number): Set<number> {
  return new Set(
    posts
      .filter((post) => post.collectionIds.includes(collectionId))
      .map((post) => post.id)
  )
}

const sameSet = (a: Set<number>, b: Set<number>) =>
  a.size === b.size && [...a].every((id) => b.has(id))

/**
 * Create a collection, or edit one with its posts (presentation `PostsView`
 * :986-1116 @ d843c3b) on the dialog primitive. Mount it with a fresh `key`
 * per opening: its form starts from the collection it was opened for.
 * Editing sends `postIds` only when the set changed, as that key replaces
 * the whole set (BE-CONT-15).
 */
export function CollectionDialog({
  viewerId,
  open,
  collection,
  posts,
  onClose,
  onNoPage,
}: Props) {
  const t = useTranslations('posts.collections.dialog')
  const tErrors = useTranslations('posts.errors')
  const tList = useTranslations('posts.list')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const ids = useId()
  const create = useCreateCollectionMutation(viewerId)
  const update = useUpdateCollectionMutation(viewerId)
  const [initialPosts] = useState(() =>
    collection ? postsIn(posts, collection.id) : new Set<number>()
  )
  const [title, setTitle] = useState(collection?.title ?? '')
  const [description, setDescription] = useState(collection?.description ?? '')
  const [picked, setPicked] = useState<Set<number>>(() => new Set(initialPosts))
  const [search, setSearch] = useState('')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const pending = create.isPending || update.isPending

  const query = search.trim().toLocaleLowerCase(locale)
  const shown = query
    ? posts.filter((post) =>
        post.title.toLocaleLowerCase(locale).includes(query)
      )
    : posts

  function toggle(postId: number, checked: boolean) {
    setPicked((current) => {
      const next = new Set(current)
      if (checked) next.add(postId)
      else next.delete(postId)
      return next
    })
    setFormError(null)
  }

  function failed(error: ApiError) {
    if (error.code === NO_PAGE) {
      onNoPage()
      onClose()
    } else if (error.code === 'CONTENT_COLLECTION_TITLE_TAKEN') {
      setTitleError(tErrors('collectionTitleTaken'))
    } else {
      setFormError(tErrors(postErrorKey(error)))
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError(t('titleRequired'))
      return
    }
    if (picked.size > MAX_COLLECTION_POSTS) {
      setFormError(t('tooManyPosts', { max: MAX_COLLECTION_POSTS }))
      return
    }
    const desc = description.trim() || null
    if (collection) {
      update.mutate(
        {
          collectionId: collection.id,
          title: trimmed,
          description: desc,
          ...(sameSet(picked, initialPosts) ? {} : { postIds: [...picked] }),
        },
        {
          onSuccess: () => {
            toast.success(t('savedToast'))
            onClose()
          },
          onError: failed,
        }
      )
    } else {
      create.mutate(
        {
          title: trimmed,
          description: desc,
          ...(picked.size > 0 ? { postIds: [...picked] } : {}),
        },
        {
          onSuccess: () => {
            toast.success(t('createdToast'))
            onClose()
          },
          onError: failed,
        }
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose()
      }}
    >
      <DialogContent closeLabel={tCommon('close')} className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {collection ? t('editTitle') : t('createTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor={`${ids}-title`}>
              {t('titleLabel')}
              <span aria-hidden className="text-destructive">
                *
              </span>
            </Label>
            <Input
              id={`${ids}-title`}
              dir="auto"
              value={title}
              maxLength={MAX_COLLECTION_TITLE}
              required
              placeholder={t('titlePlaceholder')}
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? `${ids}-title-error` : undefined}
              onChange={(event) => {
                setTitle(event.target.value)
                setTitleError(null)
              }}
            />
            {titleError ? (
              <p
                id={`${ids}-title-error`}
                role="alert"
                className="text-label text-destructive"
              >
                {titleError}
              </p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${ids}-description`}>
              {t('descriptionLabel')}
            </Label>
            <Textarea
              id={`${ids}-description`}
              dir="auto"
              rows={2}
              value={description}
              maxLength={MAX_COLLECTION_DESCRIPTION}
              placeholder={t('descriptionPlaceholder')}
              className="resize-none"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <fieldset className="grid gap-2 border-t pt-4">
            <legend className="mb-2 text-label font-semibold text-foreground">
              {t('postsLabel', { count: picked.size })}
            </legend>
            {posts.length === 0 ? (
              <p className="rounded-md border border-dashed px-4 py-5 text-center text-label text-muted-foreground">
                {t('noPosts')}
              </p>
            ) : (
              <>
                <div className="relative">
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 start-3 my-auto size-3.5 text-muted-foreground"
                  />
                  <Input
                    type="search"
                    value={search}
                    aria-label={t('searchLabel')}
                    placeholder={t('searchPlaceholder')}
                    className="h-9 ps-8.5 text-label"
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
                  {shown.map((post) => {
                    const id = `${ids}-post-${post.id}`
                    return (
                      <li
                        key={post.id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-muted/60"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Checkbox
                            id={id}
                            checked={picked.has(post.id)}
                            onCheckedChange={(checked) =>
                              toggle(post.id, checked === true)
                            }
                          />
                          <label
                            htmlFor={id}
                            dir="auto"
                            className="cursor-pointer truncate text-label text-foreground"
                          >
                            {post.title || tList('untitled')}
                          </label>
                        </div>
                        <Badge variant={isDraft(post) ? 'amber' : 'neutral'}>
                          {isDraft(post)
                            ? tList('badge.draft')
                            : tList('badge.published')}
                        </Badge>
                      </li>
                    )
                  })}
                  {shown.length === 0 ? (
                    <li className="py-4 text-center text-label text-muted-foreground">
                      {t('noMatch')}
                    </li>
                  ) : null}
                </ul>
              </>
            )}
          </fieldset>

          {formError ? (
            <p role="alert" className="text-body-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t('saving') : collection ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
