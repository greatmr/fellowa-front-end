import { z } from 'zod'

import type { PostFile, StudioPost } from '@/features/posts/types/post'
import { parseEnvelope } from '@/lib/api/envelope'
import { httpUrlOrNull } from '@/lib/url'

// ---- Limits from the back-end DTOs (`back-end/src/modules/content/dto`) ----

/** `CreateTextContentDto.title` @MaxLength(200), `post.title` varchar(200). */
export const MAX_POST_TITLE = 200
/** `PAYWALL_POSITION_MAX`: the `integer` column's upper limit. */
export const PAYWALL_POSITION_MAX = 2_147_483_647

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
  createdAt: z.string(),
  // Owner-only key (BE-CONT-04); every route here is the owner's.
  paywallPosition: z.number().int().nonnegative().nullable(),
})

type RawPost = z.infer<typeof rawPostSchema>

const toFile = (file: z.infer<typeof rawFileSchema>): PostFile => ({
  id: file.id,
  url: httpUrlOrNull(file.url),
})

function toPost(raw: RawPost): StudioPost {
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
  }
}

/** `GET /content`: the owner's posts, newest first, drafts included. */
export function parsePostList(value: unknown): StudioPost[] {
  return parseEnvelope(z.array(rawPostSchema), value, invalid).map(toPost)
}

/** `GET /content/:id` and every create/update route (owner view). */
export function parsePost(value: unknown): StudioPost {
  return toPost(parseEnvelope(rawPostSchema, value, invalid))
}

/** `POST /content/image-file`, `POST /content/:id/attachment`: `{id, url}`. */
export function parseUploadedFile(value: unknown): PostFile {
  return toFile(parseEnvelope(rawFileSchema, value, invalid))
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
  })
  .strict()

export const savePostSchema = z
  .object({
    postId: id.optional(),
    kind: z.enum(['text', 'image']),
    payload: postWriteSchema,
  })
  .strict()
  .refine((input) => input.kind === 'image' || !input.payload.imageIds)

export const postStatusSchema = z
  .object({
    postId: id,
    // Resent as stored; the server ignores a blank one on PUT.
    title: z.string().max(MAX_POST_TITLE),
    visibility: visibilitySchema,
  })
  .strict()
