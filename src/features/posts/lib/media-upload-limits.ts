import type { MediaUploadKind } from '@/features/posts/types/post'

const MB = 1024 * 1024
const GB = 1024 * MB

/**
 * `ARVAN_UPLOAD` (back-end `upload-policies.ts`, O-6, BE-CONT-08): one list
 * for video and audio, compared exactly with the declared `fileType`
 * ([PROP] there). A file off the list or over the cap still answers 415 / 413
 * from the server; these are the UX check.
 */
export const VIDEO_UPLOAD_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
] as const
export const AUDIO_UPLOAD_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/wav',
] as const
export const MEDIA_UPLOAD_TYPES = [
  ...VIDEO_UPLOAD_TYPES,
  ...AUDIO_UPLOAD_TYPES,
] as const

export const MEDIA_TYPES_BY_KIND: Record<MediaUploadKind, readonly string[]> = {
  video: VIDEO_UPLOAD_TYPES,
  audio: AUDIO_UPLOAD_TYPES,
}

/** `UPLOAD_VIDEO_MAX_BYTES` default, 2 GB (O-6); audio shares it ([PROP]). */
export const MAX_MEDIA_UPLOAD_BYTES = 2 * GB

/**
 * One chunk's bytes. The API holds a chunk in memory up to
 * `UPLOAD_CHUNK_MAX_BYTES` (10 MB default, [PROP]), and each chunk reaches it
 * through a Server Action whose body limit is about 10 MB
 * (`SERVER_ACTION_BODY_LIMIT_BYTES`). 4 MB stays under both with room, and
 * keeps one request near two minutes at 256 kbit/s ([PROP] here; 2 GB is 512
 * requests). `media-upload.test.ts` pins it under the action limit.
 * Next runs one client's Server Actions one at a time, so other actions on
 * the page (refetches, attachments) wait behind the chunk in flight.
 */
export const MEDIA_CHUNK_BYTES = 4 * MB
