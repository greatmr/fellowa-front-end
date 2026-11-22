'use client'

import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { Headphones, Video, X } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { useUploadPostMediaMutation } from '@/features/posts/api/post-hooks'
import {
  MediaUploadCancelledError,
  type MediaUploadProgress,
} from '@/features/posts/lib/media-upload'
import {
  MAX_MEDIA_UPLOAD_BYTES,
  MEDIA_TYPES_BY_KIND,
} from '@/features/posts/lib/media-upload-limits'
import { NO_PAGE } from '@/features/posts/lib/post-errors'
import type { DraftUpload } from '@/features/posts/lib/post-draft'
import { fileProblem } from '@/features/posts/lib/upload-limits'
import type { MediaUploadKind } from '@/features/posts/types/post'

type Problem = 'type' | 'size' | 'unavailable' | 'upload' | 'cancelled' | null

type Props = {
  viewerId: number
  kind: MediaUploadKind
  upload: DraftUpload | null
  onUploaded: (upload: DraftUpload | null) => void
  onNoPage: () => void
  onSessionExpired: () => void
  /** The composer's "upload the file first" check, on publish. */
  showRequired: boolean
}

const icons = { video: Video, audio: Headphones } as const

/**
 * The video or audio block (`ComposerView.tsx:300-380`: a progress bar with a
 * percentage that turns into an "attached" chip). The file goes through the
 * API's Arvan upload when picked (`upload/init` → chunks → `finalize-*`) and
 * joins the post when it is saved (`videoId` / `audioId`). A saved file is
 * shown, not replaced: the route attaches and never removes, and no route
 * deletes a video or audio (api.md), so a second upload would add a second
 * file to the post.
 */
export function PostMediaField({
  viewerId,
  kind,
  upload,
  onUploaded,
  onNoPage,
  onSessionExpired,
  showRequired,
}: Props) {
  const t = useTranslations(`posts.composer.media.${kind}`)
  const tMedia = useTranslations('posts.composer.media')
  const format = useFormatter()
  const input = useRef<HTMLInputElement>(null)
  const cancelled = useRef(false)
  const mutation = useUploadPostMediaMutation(viewerId)
  const [progress, setProgress] = useState<MediaUploadProgress | null>(null)
  const [problem, setProblem] = useState<Problem>(null)
  // Cancel takes effect after the chunk in flight, which can take minutes.
  const [cancelling, setCancelling] = useState(false)
  const headingId = useId()
  const types = MEDIA_TYPES_BY_KIND[kind]
  const Icon = icons[kind]

  // Leaving the composer stops the upload after the chunk in flight.
  useEffect(() => {
    cancelled.current = false
    return () => {
      cancelled.current = true
    }
  }, [])

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const refused = fileProblem(file, types, MAX_MEDIA_UPLOAD_BYTES)
    setProblem(refused)
    if (refused) return
    cancelled.current = false
    setCancelling(false)
    setProgress({ phase: 'uploading', sent: 0, total: file.size })
    mutation.mutate(
      {
        file,
        kind,
        onProgress: setProgress,
        isCancelled: () => cancelled.current,
      },
      {
        onSuccess: (media) => onUploaded({ ...media, attached: false }),
        onError: (error) => {
          if (error instanceof MediaUploadCancelledError) {
            setProblem('cancelled')
          } else if (error.code === NO_PAGE) onNoPage()
          else if (error.status === 401) onSessionExpired()
          else if (error.code === 'UPLOAD_TOO_LARGE') setProblem('size')
          else if (error.code === 'UPLOAD_TYPE_NOT_ALLOWED') setProblem('type')
          else if (error.code === 'INTEGRATION_NOT_CONFIGURED')
            setProblem('unavailable')
          else setProblem('upload')
        },
        onSettled: () => {
          setProgress(null)
          setCancelling(false)
        },
      }
    )
  }

  const active = mutation.isPending ? progress : null
  const uploading = active !== null
  const ratio = active && active.total > 0 ? active.sent / active.total : 0

  return (
    <section aria-labelledby={headingId} className="grid gap-3">
      <div>
        <h2 id={headingId} className="text-body font-semibold text-foreground">
          {t('title')}
        </h2>
        <p className="mt-1 text-label text-muted-foreground">{t('hint')}</p>
      </div>

      {upload ? (
        <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon aria-hidden className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p
              dir="auto"
              className="truncate text-label font-medium text-foreground"
            >
              {upload.name ?? t('unnamed')}
            </p>
            <p className="text-caption text-muted-foreground">
              {upload.attached ? tMedia('savedNote') : tMedia('pendingNote')}
            </p>
          </div>
          {upload.attached ? null : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('remove')}
              title={t('remove')}
              onClick={() => onUploaded(null)}
            >
              <X aria-hidden />
            </Button>
          )}
        </div>
      ) : null}

      {active ? (
        <div className="grid gap-2 rounded-md border p-3">
          <div className="flex items-center justify-between gap-3 text-label font-medium text-muted-foreground">
            <span role="status">
              {active.phase === 'finalizing'
                ? tMedia('finalizing')
                : cancelling
                  ? tMedia('cancelling')
                  : t('uploading')}
            </span>
            <span>{format.number(ratio, { style: 'percent' })}</span>
          </div>
          <div
            role="progressbar"
            aria-label={t('uploading')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 100)}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-300"
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          {active.phase === 'uploading' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-self-start"
              disabled={cancelling}
              onClick={() => {
                cancelled.current = true
                setCancelling(true)
              }}
            >
              {tMedia('cancel')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {!upload && !uploading ? (
        <>
          <input
            ref={input}
            type="file"
            accept={types.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            data-testid={`post-${kind}-input`}
            onChange={choose}
          />
          <Button
            type="button"
            variant="outline"
            className="justify-self-start"
            onClick={() => input.current?.click()}
          >
            <Icon aria-hidden />
            {t('add')}
          </Button>
        </>
      ) : null}

      {upload || uploading ? null : (
        <p className="text-caption text-muted-foreground">
          {tMedia('playbackNote')}
        </p>
      )}

      {problem ? (
        <p role="alert" className="text-label text-destructive">
          {problem === 'type' || problem === 'size'
            ? t(problemKey[problem])
            : tMedia(problemKey[problem])}
        </p>
      ) : showRequired && !upload ? (
        <p role="alert" className="text-label text-destructive">
          {t('required')}
        </p>
      ) : null}
    </section>
  )
}

const problemKey = {
  type: 'typeError',
  size: 'sizeError',
  unavailable: 'unavailable',
  upload: 'uploadError',
  cancelled: 'cancelled',
} as const
