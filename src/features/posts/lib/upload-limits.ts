const MB = 1024 * 1024

/**
 * `IMAGE_UPLOAD` (back-end `upload-policies.ts`, BE-CONT-08): JPEG, PNG, WebP
 * and GIF up to 10 MB, provisional. A larger or other file still answers 413
 * `UPLOAD_TOO_LARGE` / 415 `UPLOAD_TYPE_NOT_ALLOWED` from the server.
 */
export const POST_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const
export const MAX_POST_IMAGE_BYTES = 10 * MB

/** `ATTACHMENT_UPLOAD`: the image types plus documents, archives and MP3. */
export const POST_ATTACHMENT_TYPES = [
  ...POST_IMAGE_TYPES,
  'application/pdf',
  'application/zip',
  'text/plain',
  'audio/mpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const

/**
 * The API takes attachments up to 25 MB, but they reach it through a Server
 * Action, whose body limit (`next.config.ts`, FE-TIER-02) leaves room for
 * 10 MB. Raising it is a config decision, so the smaller number applies
 * (`upload-limits.test.ts` pins it under that limit).
 */
export const MAX_POST_ATTACHMENT_BYTES = 10 * MB

/** Why a picked file is refused before it is sent. */
export type FileProblem = 'type' | 'size' | null

export function fileProblem(
  file: File,
  types: readonly string[],
  maxBytes: number
): FileProblem {
  if (!types.includes(file.type)) return 'type'
  if (file.size === 0 || file.size > maxBytes) return 'size'
  return null
}
