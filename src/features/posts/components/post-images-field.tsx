'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import Image from 'next/image'
import { ImageIcon, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  useDeletePostImageMutation,
  useUploadPostImageMutation,
} from '@/features/posts/api/post-hooks'
import { NO_PAGE } from '@/features/posts/lib/post-errors'
import type { DraftImage } from '@/features/posts/lib/post-draft'
import {
  MAX_POST_IMAGE_BYTES,
  POST_IMAGE_TYPES,
  fileProblem,
} from '@/features/posts/lib/upload-limits'
import type { ApiError } from '@/lib/api/errors'

type Problem = 'type' | 'size' | 'upload' | 'delete' | null

type Props = {
  viewerId: number
  images: DraftImage[]
  /** Applied to the latest list, as an upload or delete can outlast an edit. */
  onUpdate: (update: (images: DraftImage[]) => DraftImage[]) => void
  onNoPage: () => void
  onSessionExpired: () => void
}

/**
 * The image post's images (FQ-30 (3); `ComposerView.tsx` gallery block):
 * each goes to `POST /content/image-file` when picked and joins the post when
 * it is saved (`imageIds`). Removing a saved image deletes it on the server;
 * removing one not yet saved only drops it here, as no route deletes an
 * unattached upload (api.md → "What is still open").
 */
export function PostImagesField({
  viewerId,
  images,
  onUpdate,
  onNoPage,
  onSessionExpired,
}: Props) {
  const t = useTranslations('posts.composer.images')
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadPostImageMutation(viewerId)
  const remove = useDeletePostImageMutation(viewerId)
  const [problem, setProblem] = useState<Problem>(null)

  function failed(error: ApiError, fallback: Problem) {
    if (error.code === NO_PAGE) onNoPage()
    else if (error.status === 401) onSessionExpired()
    else if (error.code === 'UPLOAD_TOO_LARGE') setProblem('size')
    else if (error.code === 'UPLOAD_TYPE_NOT_ALLOWED') setProblem('type')
    else setProblem(fallback)
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const refused = fileProblem(file, POST_IMAGE_TYPES, MAX_POST_IMAGE_BYTES)
    setProblem(refused)
    if (refused) return
    upload.mutate(file, {
      onSuccess: (image) =>
        onUpdate((current) => [...current, { ...image, attached: false }]),
      onError: (error) => failed(error, 'upload'),
    })
  }

  function drop(image: DraftImage) {
    setProblem(null)
    const without = (current: DraftImage[]) =>
      current.filter((item) => item.id !== image.id)
    if (!image.attached) {
      onUpdate(without)
      return
    }
    remove.mutate(image.id, {
      onSuccess: () => onUpdate(without),
      onError: (error) => failed(error, 'delete'),
    })
  }

  const hasPending = images.some((image) => !image.attached)

  return (
    <section aria-labelledby="post-images-title" className="grid gap-3">
      <div>
        <h2
          id="post-images-title"
          className="text-body font-semibold text-foreground"
        >
          {t('title')}
        </h2>
        <p className="mt-1 text-label text-muted-foreground">{t('hint')}</p>
      </div>
      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <li
              key={image.id}
              className="relative aspect-square overflow-hidden rounded-md border bg-muted"
            >
              {image.url ? (
                // The bucket host is not in `images.remotePatterns`; served as is.
                <Image
                  src={image.url}
                  alt={t('alt', { index: index + 1 })}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-muted-foreground">
                  <ImageIcon aria-hidden />
                  <span className="sr-only">
                    {t('alt', { index: index + 1 })}
                  </span>
                </span>
              )}
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                disabled={remove.isPending}
                onClick={() => drop(image)}
                aria-label={t(image.attached ? 'removeSaved' : 'remove', {
                  index: index + 1,
                })}
                className="absolute end-2 top-2 shadow-sm"
              >
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        ref={input}
        type="file"
        accept={POST_IMAGE_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="post-image-input"
        onChange={choose}
      />
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        disabled={upload.isPending}
        onClick={() => input.current?.click()}
      >
        <ImageIcon aria-hidden />
        {upload.isPending ? t('uploading') : t('add')}
      </Button>
      {hasPending ? (
        <p className="text-caption text-muted-foreground">{t('pendingNote')}</p>
      ) : null}
      {problem ? (
        <p role="alert" className="text-label text-destructive">
          {t(problemKey[problem])}
        </p>
      ) : null}
    </section>
  )
}

const problemKey = {
  type: 'typeError',
  size: 'sizeError',
  upload: 'uploadError',
  delete: 'deleteError',
} as const
