import { MEDIA_CHUNK_BYTES } from '@/features/posts/lib/media-upload-limits'
import type {
  MediaUploadFinish,
  MediaUploadKind,
  MediaUploadSession,
  MediaUploadStart,
  PostMedia,
} from '@/features/posts/types/post'

/**
 * The API's Arvan upload (api.md → `upload/init`, `upload/chunk`,
 * `upload/finalize-*`). The API speaks TUS to Arvan; the browser never does.
 * It sends plain multipart chunks to the API, in order, from offset 0, and
 * counts the offset itself: each chunk answers only after Arvan took it, and
 * the answer's body is Arvan's, unread.
 */
export type MediaUploadSteps = {
  init: (start: MediaUploadStart) => Promise<MediaUploadSession>
  chunk: (form: FormData) => Promise<void>
  finalize: (finish: MediaUploadFinish) => Promise<PostMedia>
}

export type MediaUploadProgress = {
  phase: 'uploading' | 'finalizing'
  /** Bytes Arvan has confirmed; 0 … `total`. */
  sent: number
  total: number
}

export class MediaUploadCancelledError extends Error {
  constructor() {
    super('Upload cancelled')
    this.name = 'MediaUploadCancelledError'
  }
}

/**
 * The chunk request's form: the bytes as the one file part (the route takes
 * no text field: `fields: 0`), the rest as the query the action builds.
 */
export function chunkForm(
  session: MediaUploadSession,
  offset: number,
  bytes: Blob
): FormData {
  const form = new FormData()
  form.append('file', bytes, 'chunk')
  form.append('uploadUrl', session.uploadUrl)
  form.append('uploadToken', session.uploadToken)
  form.append('offset', String(offset))
  return form
}

/**
 * Uploads one file and returns the finalized media (`id` for `videoId` /
 * `audioId`). `isCancelled` is read between requests: a chunk already sent
 * runs to its end. Any failure throws; nothing resumes a half-sent file,
 * because a chunk that failed midway may have been partly stored by Arvan and
 * the API offers no way to read the offset back.
 */
export async function uploadMediaFile(
  file: File,
  kind: MediaUploadKind,
  steps: MediaUploadSteps,
  {
    onProgress,
    isCancelled = () => false,
    chunkBytes = MEDIA_CHUNK_BYTES,
  }: {
    onProgress?: (progress: MediaUploadProgress) => void
    isCancelled?: () => boolean
    chunkBytes?: number
  } = {}
): Promise<PostMedia> {
  const total = file.size
  const stopIfCancelled = () => {
    if (isCancelled()) throw new MediaUploadCancelledError()
  }
  const session = await steps.init({
    fileName: file.name,
    fileSize: total,
    fileType: file.type,
  })
  let offset = 0
  onProgress?.({ phase: 'uploading', sent: 0, total })
  while (offset < total) {
    stopIfCancelled()
    const bytes = file.slice(offset, Math.min(offset + chunkBytes, total))
    await steps.chunk(chunkForm(session, offset, bytes))
    offset += bytes.size
    onProgress?.({ phase: 'uploading', sent: offset, total })
  }
  stopIfCancelled()
  onProgress?.({ phase: 'finalizing', sent: total, total })
  return steps.finalize({
    kind,
    fileId: session.fileId,
    uploadToken: session.uploadToken,
  })
}
