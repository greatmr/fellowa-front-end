import { z } from 'zod'

import {
  MEDIA_UPLOAD_TYPES,
  MAX_MEDIA_UPLOAD_BYTES,
} from '@/features/posts/lib/media-upload-limits'
import type {
  MediaUploadSession,
  PostFile,
  PostMedia,
  OwnerPost,
} from '@/features/posts/types/post'
import { parseEnvelope } from '@/lib/api/envelope'
import { httpUrlOrNull } from '@/lib/url'

// ---- Limits from the back-end DTOs (`back-end/src/modules/content/dto`) ----

/** `CreateTextContentDto.title` @MaxLength(200), `post.title` varchar(200). */
export const MAX_POST_TITLE = 200
/** `PAYWALL_POSITION_MAX`: the `integer` column's upper limit. */
export const PAYWALL_POSITION_MAX = 2_147_483_647
/** `PollOptionItemDto.option` @MaxLength(160), `poll_option.label` varchar(160). */
export const MAX_POLL_OPTION = 160
/** `InitUploadDto.fileName` @MaxLength(255), `post_media.file_name`. */
export const MAX_UPLOAD_FILE_NAME = 255

export class InvalidPostResponseError extends Error {
  constructor() {
    super('Invalid post response')
    this.name = 'InvalidPostResponseError'
  }
}

const invalid = () => new InvalidPostResponseError()

const id = z.number().int().positive().safe()

// ---- Raw responses (`formatForOwner`, only the keys the studio reads) ------

const rawFileSchema = z.object({ id, url: z.string().nullable() })

/** `videos[]` / `audios[]` items (`formatMedia`); only the keys shown. */
const rawCloudMediaSchema = z.object({
  id,
  fileNameCloud: z.string().nullable(),
})

const rawPollSchema = z.object({
  typeSelect: z.boolean(),
  endDataPublished: z.string().nullable(),
  options: z.array(z.object({ id, option: z.string() })),
})

const rawPostSchema = z.object({
  id,
  type: z.string(),
  title: z.string(),
  text: z.string().nullable(),
  visibility: z.object({
    type: z.boolean(),
    datePublished: z.string().nullable(),
    dateEarly: z.string().nullish(),
    textPreview: z.string().nullish(),
  }),
  images: z.array(rawFileSchema),
  attachments: z.array(rawFileSchema),
  videos: z.array(rawCloudMediaSchema),
  audios: z.array(rawCloudMediaSchema),
  // At most one: `poll.post_id` is UNIQUE (api.md).
  polls: z.array(rawPollSchema).max(1),
  createdAt: z.string(),
  // Owner-only key (BE-CONT-04); every route here is the owner's.
  paywallPosition: z.number().int().nonnegative().nullable(),
})

type RawPost = z.infer<typeof rawPostSchema>

const toFile = (file: z.infer<typeof rawFileSchema>): PostFile => ({
  id: file.id,
  url: httpUrlOrNull(file.url),
})

const toMedia = (media: z.infer<typeof rawCloudMediaSchema>): PostMedia => ({
  id: media.id,
  name: media.fileNameCloud,
})

function toPost(raw: RawPost): OwnerPost {
  const poll = raw.polls[0]
  return {
    id: raw.id,
    type: raw.type,
    title: raw.title,
    text: raw.text ?? '',
    isPublic: raw.visibility.type,
    publishedAt: raw.visibility.datePublished,
    createdAt: raw.createdAt,
    paywallPosition: raw.paywallPosition,
    textPreview: raw.visibility.textPreview ?? null,
    dateEarly: raw.visibility.dateEarly ?? null,
    images: raw.images.map(toFile),
    attachments: raw.attachments.map(toFile),
    videos: raw.videos.map(toMedia),
    audios: raw.audios.map(toMedia),
    poll: poll
      ? {
          multiSelect: poll.typeSelect,
          closesAt: poll.endDataPublished,
          options: poll.options.map((option) => ({
            id: option.id,
            label: option.option,
          })),
        }
      : null,
  }
}

/** `GET /content`: the owner's posts, newest first, drafts included. */
export function parsePostList(value: unknown): OwnerPost[] {
  return parseEnvelope(z.array(rawPostSchema), value, invalid).map(toPost)
}

/** `GET /content/:id` and every create/update route (owner view). */
export function parsePost(value: unknown): OwnerPost {
  return toPost(parseEnvelope(rawPostSchema, value, invalid))
}

/** `POST /content/image-file`, `POST /content/:id/attachment`: `{id, url}`. */
export function parseUploadedFile(value: unknown): PostFile {
  return toFile(parseEnvelope(rawFileSchema, value, invalid))
}

/**
 * `POST /content/upload/init`: Arvan's answer spread, plus `fileId`,
 * `uploadToken` and, only when Arvan named one, `uploadUrl`. Without the URL
 * no chunk can be sent, so that answer is refused here as unusable.
 */
export function parseUploadSession(value: unknown): MediaUploadSession {
  return parseEnvelope(
    z.object({
      fileId: z.string().min(1),
      uploadUrl: z.string().min(1),
      uploadToken: z.string().min(1),
    }),
    value,
    invalid
  )
}

/** `POST /content/upload/chunk` answers with Arvan's body, unread here. */
export function parseUploadChunk(value: unknown): void {
  parseEnvelope(z.unknown(), value, invalid)
}

/**
 * `POST /content/upload/finalize-{video|audio}`: `{id, …, fileNameCloud,
 * status: 'Converting'}`. `id` is what `videoId` / `audioId` take.
 */
export function parseFinalizedMedia(value: unknown): PostMedia {
  const data = parseEnvelope(
    z.object({ id, fileNameCloud: z.string().nullish() }),
    value,
    invalid
  )
  return { id: data.id, name: data.fileNameCloud ?? null }
}

/** `DELETE` routes answer `{message}`. */
export function parseDeleted(value: unknown): void {
  parseEnvelope(z.object({ message: z.string() }), value, invalid)
}

// ---- Inputs the server actions accept (checked again before sending) ------

export const postIdSchema = id

const visibilitySchema = z
  .object({
    type: z.boolean(),
    isDraft: z.boolean().optional(),
    datePublished: z.iso.datetime({ offset: true }).optional(),
    textPreview: z.string().optional(),
    earlyAccess: z.boolean().optional(),
    dateEarly: z.iso.datetime({ offset: true }).optional(),
  })
  .strict()

const titleSchema = z
  .string()
  .max(MAX_POST_TITLE)
  .refine((value) => value.trim().length > 0)

export const postWriteSchema = z
  .object({
    title: titleSchema,
    text: z.string(),
    paywallPosition: z
      .number()
      .int()
      .min(0)
      .max(PAYWALL_POSITION_MAX)
      .nullable(),
    tireIds: z.array(id).optional(),
    visibility: visibilitySchema,
    imageIds: z.array(id).optional(),
    videoId: id.optional(),
    audioId: id.optional(),
    options: z
      .array(
        z
          .object({
            option: z
              .string()
              .max(MAX_POLL_OPTION)
              .refine((value) => value.trim().length > 0),
          })
          .strict()
      )
      .optional(),
    typeSelect: z.boolean().optional(),
    endDataPublished: z.iso.datetime({ offset: true }).optional(),
  })
  .strict()

const writeKindSchema = z.enum(['text', 'image', 'video', 'audio', 'poll'])

const pollKeys = ['options', 'typeSelect', 'endDataPublished'] as const

/** Each route's own keys, and none of another's (FQ-30: one media type). */
function keysFitKind(
  kind: z.infer<typeof writeKindSchema>,
  payload: z.infer<typeof postWriteSchema>
): boolean {
  if (kind !== 'image' && payload.imageIds) return false
  if (kind !== 'video' && payload.videoId !== undefined) return false
  if (kind !== 'audio' && payload.audioId !== undefined) return false
  const hasPollKeys = pollKeys.some((key) => payload[key] !== undefined)
  if (kind !== 'poll') return !hasPollKeys
  return payload.options !== undefined
}

export const savePostSchema = z
  .object({
    postId: id.optional(),
    kind: writeKindSchema,
    payload: postWriteSchema,
  })
  .strict()
  .refine((input) => keysFitKind(input.kind, input.payload))

export const mediaUploadStartSchema = z
  .object({
    fileName: z
      .string()
      .max(MAX_UPLOAD_FILE_NAME)
      .refine((value) => value.trim().length > 0),
    fileSize: z.number().int().min(1).max(MAX_MEDIA_UPLOAD_BYTES),
    fileType: z.enum(MEDIA_UPLOAD_TYPES),
  })
  .strict()

/** Opaque values from `upload/init`, bounded; the API checks them. */
const uploadValue = z.string().min(1).max(4096)

export const mediaUploadFinishSchema = z
  .object({
    kind: z.enum(['video', 'audio']),
    fileId: uploadValue,
    uploadToken: uploadValue,
  })
  .strict()

export const mediaChunkFieldsSchema = z
  .object({
    uploadUrl: uploadValue,
    uploadToken: uploadValue,
    // Fifteen digits, as `UploadChunkQueryDto.upload_offset`.
    offset: z.string().regex(/^\d{1,15}$/),
  })
  .strict()

export const postStatusSchema = z
  .object({
    postId: id,
    // Resent as stored; the server ignores a blank one on PUT.
    title: z.string().max(MAX_POST_TITLE),
    visibility: visibilitySchema,
  })
  .strict()
