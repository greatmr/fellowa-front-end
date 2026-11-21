'use client'

import { useId, useState } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { postKeys, useSavePostMutation } from '@/features/posts/api/post-hooks'
import { PostAccessPanel } from '@/features/posts/components/post-access-panel'
import { PostAttachments } from '@/features/posts/components/post-attachments'
import { PostBodyEditor } from '@/features/posts/components/post-body-editor'
import { PostImagesField } from '@/features/posts/components/post-images-field'
import { PostsAliasNotice } from '@/features/posts/components/posts-alias-notice'
import {
  draftFromPost,
  draftProblems,
  emptyPostDraft,
  saveInputFromDraft,
  type PostDraft,
  type SaveIntent,
} from '@/features/posts/lib/post-draft'
import { NO_PAGE, postErrorKey } from '@/features/posts/lib/post-errors'
import { MAX_POST_TITLE } from '@/features/posts/schemas/post'
import type { StudioPost } from '@/features/posts/types/post'
import { Link, useRouter } from '@/i18n/navigation'
import type { ApiError } from '@/lib/api/errors'
import { cn } from '@/lib/utils'

type Props = {
  viewerId: number
  /** The post being edited, kept fresh by its query; `null` creates one. */
  saved: StudioPost | null
}

/**
 * The composer (presentation `ComposerView` @ d843c3b), for text and image
 * posts (FQ-30 (3)): title, plain-text body with the paywall divider, images,
 * attachments once saved, access, and publish or save as draft (no date:
 * Q-18). Not ported (FQ-31, FQ-30): the formatting toolbar, the audio, video
 * and poll blocks (FE-POST-02), the single-post purchase switch and the
 * collections picker, the "upload error" demo button, and the "saved
 * automatically" line (nothing autosaves).
 */
export function PostComposer({ viewerId, saved }: Props) {
  const t = useTranslations('posts.composer')
  const tErrors = useTranslations('posts.errors')
  const router = useRouter()
  const ids = useId()
  const save = useSavePostMutation(viewerId)
  // A save waits for image uploads and deletes, or it would send an id that
  // is not there yet or is going away.
  const imagesBusy =
    useIsMutating({ mutationKey: postKeys.mutation('image', viewerId) }) +
      useIsMutating({
        mutationKey: postKeys.mutation('deleteImage', viewerId),
      }) >
    0
  const [draft, setDraftState] = useState<PostDraft>(() =>
    saved ? draftFromPost(saved) : emptyPostDraft()
  )
  const [checkedFor, setCheckedFor] = useState<SaveIntent | null>(null)
  const [serverTierError, setServerTierError] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [noPage, setNoPage] = useState(false)
  const [pendingIntent, setPendingIntent] = useState<SaveIntent | null>(null)
  // Set once a save navigates away: the route change waits for the server,
  // and a second click meanwhile would create a second post.
  const [leaving, setLeaving] = useState(false)

  const problems = checkedFor ? draftProblems(draft, checkedFor) : []
  const isPublished = Boolean(saved?.publishedAt)
  const pending = save.isPending
  const busy = pending || imagesBusy || leaving

  function setDraft(patch: Partial<PostDraft>) {
    setDraftState((current) => ({ ...current, ...patch }))
    setFormError(null)
    if (patch.access !== undefined || patch.tiers !== undefined) {
      setServerTierError(false)
    }
  }

  function sessionExpired() {
    toast.error(tErrors('sessionExpired'))
  }

  function failed(error: ApiError) {
    if (error.code === NO_PAGE) setNoPage(true)
    else if (error.code === 'CONTENT_TIER_REQUIRED' && draft.access === 'tiers')
      setServerTierError(true)
    else if (error.status === 401) sessionExpired()
    else setFormError(tErrors(postErrorKey(error)))
  }

  function submit(intent: SaveIntent) {
    if (busy) return
    setCheckedFor(intent)
    if (draftProblems(draft, intent).length > 0) return
    setFormError(null)
    setServerTierError(false)
    setNoPage(false)
    setPendingIntent(intent)
    save.mutate(saveInputFromDraft(draft, intent, saved), {
      onSuccess: (post) => {
        if (intent === 'publish') {
          setLeaving(true)
          toast.success(isPublished ? t('savedToast') : t('publishedToast'))
          router.push('/studio/posts')
          return
        }
        toast.success(t('draftToast'))
        if (!saved) {
          // Keep writing on the saved draft, where attachments can be added.
          setLeaving(true)
          router.replace(`/studio/posts/${post.id}/edit`)
          return
        }
        setDraftState((current) => ({
          ...current,
          images: post.images.map((image) => ({ ...image, attached: true })),
          // Saved as free, the post lost its tier links: nothing to keep.
          tiers:
            post.isPublic && current.tiers.mode === 'keep'
              ? { mode: 'pick', ids: [] }
              : current.tiers,
        }))
        setCheckedFor(null)
      },
      onError: failed,
      onSettled: () => setPendingIntent(null),
    })
  }

  const titleInvalid = problems.includes('title')
  const tiersError = problems.includes('tiers')
    ? t('access.tiersRequired')
    : serverTierError
      ? tErrors('tierRequired')
      : null

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href="/studio/posts" aria-label={t('back')} title={t('back')}>
            <ArrowLeft aria-hidden className="rtl:rotate-180" />
          </Link>
        </Button>
        <h1 className="text-title-sm font-bold text-foreground">
          {saved ? t('editTitle') : t('createTitle')}
        </h1>
      </div>

      {noPage ? <PostsAliasNotice /> : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="grid min-w-0 flex-1 gap-6">
          <div className="grid gap-1.5">
            <label htmlFor={`${ids}-title`} className="sr-only">
              {t('titleLabel')}
            </label>
            <input
              id={`${ids}-title`}
              type="text"
              dir="auto"
              value={draft.title}
              maxLength={MAX_POST_TITLE}
              placeholder={t('titlePlaceholder')}
              aria-invalid={titleInvalid || undefined}
              aria-describedby={titleInvalid ? `${ids}-title-error` : undefined}
              onChange={(event) => setDraft({ title: event.target.value })}
              className={cn(
                'w-full rounded-md bg-transparent text-title font-bold text-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                titleInvalid && 'ring-[3px] ring-destructive/20'
              )}
            />
            {titleInvalid ? (
              <p
                id={`${ids}-title-error`}
                role="alert"
                className="text-label text-destructive"
              >
                {t('titleRequired')}
              </p>
            ) : null}
          </div>
          <PostBodyEditor
            before={draft.before}
            after={draft.after}
            isPublic={draft.access === 'free'}
            onChange={(parts) => setDraft(parts)}
          />
          <PostImagesField
            viewerId={viewerId}
            images={draft.images}
            onUpdate={(update) =>
              setDraftState((current) => ({
                ...current,
                images: update(current.images),
              }))
            }
            onNoPage={() => setNoPage(true)}
            onSessionExpired={sessionExpired}
          />
          <PostAttachments
            viewerId={viewerId}
            postId={saved?.id ?? null}
            attachments={saved?.attachments ?? []}
            onSessionExpired={sessionExpired}
          />
        </div>

        <aside className="min-w-0 lg:sticky lg:top-20 lg:w-75 lg:shrink-0">
          <Card className="gap-5 p-5">
            <PostAccessPanel
              viewerId={viewerId}
              access={draft.access}
              tiers={draft.tiers}
              canKeep={saved !== null && !saved.isPublic}
              tiersError={tiersError}
              onAccessChange={(access) => setDraft({ access })}
              onTiersChange={(tiers) => setDraft({ tiers })}
            />
            {formError ? (
              <p
                role="alert"
                className="rounded-md bg-red-50 px-3 py-2.5 text-label font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
              >
                {formError}
              </p>
            ) : null}
            <div className="grid gap-2 border-t pt-4">
              <Button
                type="button"
                disabled={busy}
                onClick={() => submit('publish')}
              >
                {pendingIntent === 'publish'
                  ? t('saving')
                  : isPublished
                    ? t('saveChanges')
                    : t('publish')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => submit('draft')}
              >
                {pendingIntent === 'draft'
                  ? t('saving')
                  : isPublished
                    ? t('moveToDraft')
                    : t('saveDraft')}
              </Button>
              {isPublished ? (
                <p className="text-caption leading-5 text-muted-foreground">
                  {t('moveToDraftHint')}
                </p>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
