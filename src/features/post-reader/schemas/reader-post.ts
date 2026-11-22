import { z } from 'zod'

import type { ReaderPost } from '@/features/post-reader/types/reader-post'
import { parseEnvelope } from '@/lib/api/envelope'
import { httpUrlOrNull } from '@/lib/url'

export class InvalidReaderPostResponseError extends Error {
  constructor() {
    super('Invalid post response')
    this.name = 'InvalidReaderPostResponseError'
  }
}

const invalid = () => new InvalidReaderPostResponseError()

/** PostgreSQL `integer` ids; larger values would overflow the backend column. */
const MAX_ID = 2_147_483_647

const id = z.number().int().positive().safe()

/**
 * A route segment that is the canonical decimal form of a creator or post id:
 * no sign, padding, exponent or value past the column, so one post has one URL
 * and nothing else reaches the API (as `creatorIdSchema` on the creator page).
 */
export const idParamSchema = z
  .string()
  .regex(/^[1-9][0-9]{0,9}$/)
  .transform(Number)
  .pipe(z.number().max(MAX_ID))

// ---- Raw responses ---------------------------------------------------------
// `publicPostFields` (landing) and `formatContent` (content), both projected by
// `applyContentAccess`. Only the keys the reader shows; zod drops the rest, so
// an extra key (a backend defect) never travels further than this parse.

const base = {
  id,
  type: z.string(),
  title: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
}

const file = z.object({ id, url: z.string().nullable() })

const fullSchema = z.object({
  ...base,
  access: z.literal('FULL'),
  text: z.string().nullable(),
  images: z.array(file),
  attachments: z.array(file),
  links: z.array(z.object({ id, link: z.string().nullable() })),
  videos: z.array(z.object({ id })),
  audios: z.array(z.object({ id, status: z.boolean() })),
  /** `GET /content/:id` only; at most one element (`poll.post_id` UNIQUE). */
  polls: z
    .array(
      z.object({
        id,
        options: z.array(z.object({ id, option: z.string() })),
      })
    )
    .optional(),
})

const partialSchema = z.object({
  ...base,
  access: z.literal('PARTIAL'),
  /** Absent when the paywall sits at 0 (Q-19). */
  text: z.string().optional(),
})

const teaserSchema = z.object({
  ...base,
  access: z.literal('TEASER'),
  /** Top-level, absent when the owner typed none. */
  textPreview: z.string().optional(),
})

const readerPostSchema = z.discriminatedUnion('access', [
  fullSchema,
  partialSchema,
  teaserSchema,
])

/** `GET /landing/posts/:id` and `GET /content/:id`. */
export function parseReaderPost(value: unknown): ReaderPost {
  const raw = parseEnvelope(readerPostSchema, value, invalid)
  const common = {
    id: raw.id,
    type: raw.type,
    title: raw.title,
    createdAt: raw.createdAt,
  }
  switch (raw.access) {
    case 'FULL': {
      const poll = raw.polls?.[0]
      return {
        ...common,
        access: 'FULL',
        text: raw.text,
        images: raw.images.map((f) => ({
          id: f.id,
          url: httpUrlOrNull(f.url),
        })),
        attachments: raw.attachments.map((f) => ({
          id: f.id,
          url: httpUrlOrNull(f.url),
        })),
        links: raw.links.map((l) => ({ id: l.id, url: httpUrlOrNull(l.link) })),
        videoCount: raw.videos.length,
        audios: raw.audios.map((a) => ({ id: a.id, ready: a.status })),
        poll: poll
          ? {
              id: poll.id,
              options: poll.options.map((o) => ({ id: o.id, label: o.option })),
            }
          : null,
      }
    }
    case 'PARTIAL':
      return { ...common, access: 'PARTIAL', text: raw.text || null }
    case 'TEASER':
      return {
        ...common,
        access: 'TEASER',
        textPreview: raw.textPreview || null,
      }
  }
}
