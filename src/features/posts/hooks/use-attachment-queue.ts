'use client'

import { useRef, useState } from 'react'

import { useUploadPostAttachmentMutation } from '@/features/posts/api/post-hooks'
import { toApiError } from '@/lib/api/errors'
import { uploadProblem, type UploadProblem } from '@/lib/api/upload-problem'

export type QueuedAttachmentStatus = 'queued' | 'uploading' | 'sent' | 'failed'

/** A picked file on its way to `POST /content/:id/attachment`. */
export type QueuedAttachment = {
  key: number
  file: File
  status: QueuedAttachmentStatus
  /** Set when `status` is `failed`. */
  problem: UploadProblem | null
}

export type AttachmentQueue = {
  items: QueuedAttachment[]
  /** Queues files; with a post id they upload at once. */
  add: (files: File[], postId: number | null) => Promise<void>
  /** Uploads every queued file to the post, one at a time. */
  sendQueued: (postId: number) => Promise<void>
  retry: (key: number, postId: number) => Promise<void>
  /** Drops a queued or failed file; one being sent or sent stays. */
  discard: (key: number) => void
  /** Files not yet on the server: queued, uploading or failed (latest). */
  unsentCount: () => number
  /** Failed files (latest). */
  failedCount: () => number
}

/**
 * Attachments need the post's id (`POST /content/:id/attachment`). A new post
 * queues them here and sends them once its first save returns an id
 * (FE-POST-05); a saved post sends each at once. A file is never dropped
 * without the owner's action: a failure stays in the list with its reason and
 * a retry. A sent file stays as `sent` while the post is unsaved, as no
 * server list shows it yet, and leaves the list on a saved post, whose
 * detail refetches with it (`usePostMutation` invalidates first).
 *
 * The list lives in a ref as well as state, so a send that started in an
 * earlier render reads and writes the latest list.
 */
export function useAttachmentQueue(
  viewerId: number,
  {
    keepSent,
    onSessionExpired,
  }: { keepSent: boolean; onSessionExpired: () => void }
): AttachmentQueue {
  const upload = useUploadPostAttachmentMutation(viewerId)
  const [items, setItems] = useState<QueuedAttachment[]>([])
  const latest = useRef<QueuedAttachment[]>([])
  const nextKey = useRef(0)

  function update(change: (current: QueuedAttachment[]) => QueuedAttachment[]) {
    latest.current = change(latest.current)
    setItems(latest.current)
  }

  function patch(key: number, change: Partial<QueuedAttachment>) {
    update((current) =>
      current.map((item) => (item.key === key ? { ...item, ...change } : item))
    )
  }

  async function send(item: QueuedAttachment, postId: number) {
    patch(item.key, { status: 'uploading', problem: null })
    try {
      await upload.mutateAsync({ postId, file: item.file })
      if (keepSent) patch(item.key, { status: 'sent' })
      else update((current) => current.filter(({ key }) => key !== item.key))
    } catch (error) {
      const problem = uploadProblem(toApiError(error))
      if (problem === 'sessionExpired') onSessionExpired()
      patch(item.key, { status: 'failed', problem })
    }
  }

  async function add(files: File[], postId: number | null) {
    const added = files.map((file) => ({
      key: nextKey.current++,
      file,
      status: 'queued' as const,
      problem: null,
    }))
    update((current) => [...current, ...added])
    if (postId === null) return
    for (const { key } of added) {
      // `sendQueued` may have taken it meanwhile; never send a file twice.
      const item = latest.current.find((entry) => entry.key === key)
      if (item?.status === 'queued') await send(item, postId)
    }
  }

  async function sendQueued(postId: number) {
    let next = latest.current.find((item) => item.status === 'queued')
    while (next) {
      await send(next, postId)
      next = latest.current.find((item) => item.status === 'queued')
    }
  }

  async function retry(key: number, postId: number) {
    const item = latest.current.find((entry) => entry.key === key)
    if (item?.status === 'failed') await send(item, postId)
  }

  function discard(key: number) {
    update((current) =>
      current.filter(
        (item) =>
          item.key !== key ||
          item.status === 'uploading' ||
          item.status === 'sent'
      )
    )
  }

  return {
    items,
    add,
    sendQueued,
    retry,
    discard,
    unsentCount: () =>
      latest.current.filter((item) => item.status !== 'sent').length,
    failedCount: () =>
      latest.current.filter((item) => item.status === 'failed').length,
  }
}
