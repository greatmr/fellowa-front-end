'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { Paperclip, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  useDeletePostAttachmentMutation,
  useUploadPostAttachmentMutation,
} from '@/features/posts/api/post-hooks'
import {
  MAX_POST_ATTACHMENT_BYTES,
  POST_ATTACHMENT_TYPES,
  fileProblem,
} from '@/features/posts/lib/upload-limits'
import type { PostFile } from '@/features/posts/types/post'
import type { ApiError } from '@/lib/api/errors'

type Problem = 'type' | 'size' | 'upload' | 'delete' | null

const problemKey = {
  type: 'typeError',
  size: 'sizeError',
  upload: 'uploadError',
  delete: 'deleteError',
} as const

/**
 * A saved post's attachments (`POST /content/:id/attachment`, `DELETE
 * /content/attachment/:id`). They need the post's id, so a new post gets them
 * after its first save. The list is the server's (`GET /content/:id`), which
 * refetches after each change.
 */
export function PostAttachments({
  viewerId,
  postId,
  attachments,
  onSessionExpired,
}: {
  viewerId: number
  /** `null` until the post is saved. */
  postId: number | null
  attachments: PostFile[]
  onSessionExpired: () => void
}) {
  const t = useTranslations('posts.composer.attachments')

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
      {postId === null ? (
        <p className="rounded-md border border-dashed p-3 text-label text-muted-foreground">
          {t('saveFirst')}
        </p>
      ) : (
        <AttachmentList
          viewerId={viewerId}
          postId={postId}
          attachments={attachments}
          onSessionExpired={onSessionExpired}
        />
      )}
    </section>
  )
}

function AttachmentList({
  viewerId,
  postId,
  attachments,
  onSessionExpired,
}: {
  viewerId: number
  postId: number
  attachments: PostFile[]
  onSessionExpired: () => void
}) {
  const t = useTranslations('posts.composer.attachments')
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadPostAttachmentMutation(viewerId, postId)
  const remove = useDeletePostAttachmentMutation(viewerId)
  const [problem, setProblem] = useState<Problem>(null)

  function failed(error: ApiError, fallback: Problem) {
    if (error.status === 401) onSessionExpired()
    else if (error.code === 'UPLOAD_TOO_LARGE') setProblem('size')
    else if (error.code === 'UPLOAD_TYPE_NOT_ALLOWED') setProblem('type')
    else setProblem(fallback)
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const refused = fileProblem(
      file,
      POST_ATTACHMENT_TYPES,
      MAX_POST_ATTACHMENT_BYTES
    )
    setProblem(refused)
    if (refused) return
    upload.mutate(file, { onError: (error) => failed(error, 'upload') })
  }

  return (
    <>
      {attachments.length === 0 ? (
        <p className="text-label text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="grid gap-2">
          {attachments.map((file, index) => (
            <li
              key={file.id}
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
                  setProblem(null)
                  remove.mutate(file.id, {
                    onError: (error) => failed(error, 'delete'),
                  })
                }}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        type="file"
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
        disabled={upload.isPending}
        onClick={() => input.current?.click()}
      >
        <Paperclip aria-hidden />
        {upload.isPending ? t('uploading') : t('add')}
      </Button>
      {problem ? (
        <p role="alert" className="text-label text-destructive">
          {t(problemKey[problem])}
        </p>
      ) : null}
    </>
  )
}
