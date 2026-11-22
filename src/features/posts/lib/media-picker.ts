import type { MediaUploadKind } from '@/features/posts/types/post'

/** The file kinds a composer media block uploads (a poll has none). */
export type MediaFileKind = 'image' | MediaUploadKind

/**
 * What an images, video or audio block exposes to the composer: the composer
 * opens the native picker from its own chooser button, inside the click, and
 * hands the picked file to the block that has just mounted.
 */
export type MediaPickerHandle = {
  kind: MediaFileKind
  start: (file: File) => void
}
