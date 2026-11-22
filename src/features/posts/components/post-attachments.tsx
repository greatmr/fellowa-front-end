'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { Loader2, Paperclip, RotateCcw, Trash2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { useDeletePostAttachmentMutation } from '@/features/posts/api/post-hooks'
import type { QueuedAttachment } from '@/features/posts/hooks/use-attachment-queue'
import type { SaveIntent } from '@/features/posts/lib/post-draft'
import { sharedUploadLine } from '@/features/posts/lib/post-errors'
import {
  MAX_POST_ATTACHMENT_BYTES,
  POST_ATTACHMENT_TYPES,
  fileProblem,
  type FileProblem,
} from '@/features/posts/lib/upload-limits'
import type { PostFile } from '@/features/posts/types/post'
import type { UploadProblem } from '@/lib/api/upload-problem'

type Props = {
  viewerId: number
  /** `null` until the post has an id; picked files wait in the queue. */
  postId: number | null
  /** The server's list (`GET /content/:id`), refetched after each change. */
  attachments: PostFile[]
  queue: QueuedAttachment[]
  onAdd: (files: File[]) => void
  onRetry: (key: number) => void
  onDiscard: (key: number) => void
  /**
   * Set when the post's first save worked and some files did not upload:
   * the owner retries or removes them, or continues without them.
   */
  afterSave: {
    intent: SaveIntent
    failed: number
    onContinue: () => void
  } | null
  onSessionExpired: () => void
}

/** Failures a retry cannot fix, so no retry is offered. */
const FINAL: readonly UploadProblem[] = ['size', 'type', 'unavailable']

/**
 * The post's attachments (`POST /content/:id/attachment`, `DELETE
 * /content/attachment/:id`; `ComposerView.tsx:348-355` @ d843c3b). The
 * paperclip works from the start: on a new post the files wait in the queue
 * and upload right after the first save (FE-POST-05, `useAttachmentQueue`).
 * Each file shows its own state; a Server Action reports no byte progress.
 */
export function PostAttachments({
  viewerId,
  postId,
  attachments,
  queue,
  onAdd,
  onRetry,
  onDiscard,
  afterSave,
  onSessionExpired,
}: Props) {
  const t = useTranslations('posts.composer.attachments')
  const tUpload = useTranslations('posts.composer.uploadErrors')
  const input = useRef<HTMLInputElement>(null)
  const remove = useDeletePostAttachmentMutation(viewerId)
  const [refused, setRefused] = useState<FileProblem>(null)
  const [deleteFailed, setDeleteFailed] = useState(false)

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return
    let problem: FileProblem = null
    const accepted = files.filter((file) => {
      const refusal = fileProblem(
        file,
        POST_ATTACHMENT_TYPES,
        MAX_POST_ATTACHMENT_BYTES
      )
      problem ??= refusal
      return refusal === null
    })
    setRefused(problem)
    if (accepted.length > 0) onAdd(accepted)
  }

  function problemLine(problem: UploadProblem | null): string {
    switch (problem) {
      case 'size':
        return t('sizeError')
      case 'type':
        return t('typeError')
      case 'unavailable':
        return t('unavailable')
      default: {
        const shared = sharedUploadLine(problem)
        return shared ? tUpload(shared) : t('uploadError')
      }
    }
  }

  const empty = attachments.length === 0 && queue.length === 0

  return (
    <section aria-labelledby="post-attachments-title" className="grid gap-3">
      <div>
        <h2
          id="post-attachments-title"
          className="text-body font-semibold text-foreground"
        >
          {t('title')}
        </h2>
        <p className="mt-1 text-label text-muted-foreground">{t('hint')}</p>
      </div>

      {afterSave ? (
        <div
          role="alert"
          className="grid gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3"
        >
          <p className="text-label font-medium text-foreground">
            {t('savedButFailed', {
              intent: afterSave.intent,
              count: afterSave.failed,
            })}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={afterSave.onContinue}
          >
            {t('continueWithout', { count: afterSave.failed })}
          </Button>
        </div>
      ) : null}

      {empty ? (
        <p className="text-label text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="grid gap-2">
          {attachments.map((file, index) => (
            <li
              key={`saved-${file.id}`}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2 text-label text-foreground">
                <Paperclip aria-hidden className="size-4 shrink-0" />
                {file.url ? (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-link hover:underline"
                  >
                    {t('file', { index: index + 1 })}
                  </a>
                ) : (
                  <span className="truncate">
                    {t('file', { index: index + 1 })}
                  </span>
                )}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={remove.isPending}
                aria-label={t('remove', { index: index + 1 })}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setDeleteFailed(false)
                  remove.mutate(file.id, {
                    onError: (error) => {
                      if (error.status === 401) onSessionExpired()
                      else setDeleteFailed(true)
                    },
                  })
                }}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
          {queue.map((item) => (
            <li
              key={`queued-${item.key}`}
              className="grid gap-1 rounded-md border px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-label text-foreground">
                  {item.status === 'uploading' ? (
                    <Loader2
                      aria-hidden
                      className="size-4 shrink-0 motion-safe:animate-spin"
                    />
                  ) : (
                    <Paperclip aria-hidden className="size-4 shrink-0" />
                  )}
                  <span dir="auto" className="truncate">
                    {item.file.name}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {item.status === 'failed' &&
                  postId !== null &&
                  !FINAL.includes(item.problem ?? 'failed') ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={t('retry', { name: item.file.name })}
                      onClick={() => onRetry(item.key)}
                    >
                      <RotateCcw aria-hidden />
                      {t('retryShort')}
                    </Button>
                  ) : null}
                  {item.status === 'queued' || item.status === 'failed' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('discard', { name: item.file.name })}
                      title={t('discard', { name: item.file.name })}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => onDiscard(item.key)}
                    >
                      <X aria-hidden />
                    </Button>
                  ) : null}
                </span>
              </div>
              {/* Separate keys: a row turning failed mounts a new alert,
                  which a screen reader announces. */}
              {item.status === 'failed' ? (
                <p
                  key="failed"
                  role="alert"
                  className="text-caption text-destructive"
                >
                  {problemLine(item.problem)}
                </p>
              ) : (
                <p
                  key="status"
                  role="status"
                  className="text-caption text-muted-foreground"
                >
                  {t(`status.${item.status}`)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        type="file"
        multiple
        accept={POST_ATTACHMENT_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="post-attachment-input"
        onChange={choose}
      />
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        onClick={() => input.current?.click()}
      >
        <Paperclip aria-hidden />
        {t('add')}
      </Button>
      {postId === null && queue.length > 0 ? (
        <p className="text-caption text-muted-foreground">{t('queuedNote')}</p>
      ) : null}
      {refused || deleteFailed ? (
        <p role="alert" className="text-label text-destructive">
          {refused === 'size'
            ? t('sizeError')
            : refused === 'type'
              ? t('typeError')
              : t('deleteError')}
        </p>
      ) : null}
    </section>
  )
}
