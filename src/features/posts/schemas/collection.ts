import { z } from 'zod'

import { InvalidPostResponseError } from '@/features/posts/schemas/post'
import type {
  OwnerCollection,
  PostCollections,
} from '@/features/posts/types/collection'
import { parseEnvelope } from '@/lib/api/envelope'

// ---- Limits from back-end `collection.dto.ts` (BE-CONT-15) ----------------

/** `COLLECTION_TITLE_MAX`, M022's `collection_title_length`. */
export const MAX_COLLECTION_TITLE = 120
/** `COLLECTION_DESCRIPTION_MAX` [PROP]. */
export const MAX_COLLECTION_DESCRIPTION = 500
/** `COLLECTION_IDS_MAX` [PROP]: ids per assign or per post. */
export const MAX_COLLECTION_IDS = 100
/** `COLLECTION_POST_IDS_MAX` [PROP]: one collection's post set. */
export const MAX_COLLECTION_POSTS = 500

const invalid = () => new InvalidPostResponseError()
const id = z.number().int().positive().safe()

// ---- Raw responses -----------------------------------------------------------

const rawCollectionSchema = z.object({
  id,
  title: z.string(),
  description: z.string().nullable(),
  postCount: z.number().int().nonnegative(),
})

const rawPostCollectionsSchema = z.object({
  postId: id,
  collectionIds: z.array(id),
})

/** `GET /content/collections`: newest first; `[]` with no page. */
export function parseCollectionList(value: unknown): OwnerCollection[] {
  return parseEnvelope(z.array(rawCollectionSchema), value, invalid)
}

/** `POST /content/collections`, `PUT /content/collections/:id`. */
export function parseCollection(value: unknown): OwnerCollection {
  return parseEnvelope(rawCollectionSchema, value, invalid)
}

/** `PUT /content/:id/collections`. */
export function parsePostCollections(value: unknown): PostCollections {
  return parseEnvelope(rawPostCollectionsSchema, value, invalid)
}

/** `POST /content/collections/assign`: one entry per post. */
export function parseAssigned(value: unknown): PostCollections[] {
  return parseEnvelope(z.array(rawPostCollectionsSchema), value, invalid)
}

// ---- Inputs the server actions accept (checked again before sending) --------

const titleSchema = z.string().trim().min(1).max(MAX_COLLECTION_TITLE)
const descriptionSchema = z
  .string()
  .trim()
  .max(MAX_COLLECTION_DESCRIPTION)
  .nullable()

export const createCollectionSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema,
    postIds: z.array(id).max(MAX_COLLECTION_POSTS).optional(),
  })
  .strict()

export const updateCollectionSchema = z
  .object({
    collectionId: id,
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    postIds: z.array(id).max(MAX_COLLECTION_POSTS).optional(),
  })
  .strict()

export const setPostCollectionsSchema = z
  .object({
    postId: id,
    collectionIds: z.array(id).max(MAX_COLLECTION_IDS),
  })
  .strict()

export const assignCollectionsSchema = z
  .object({
    postIds: z.array(id).min(1).max(MAX_COLLECTION_IDS),
    collectionIds: z.array(id).min(1).max(MAX_COLLECTION_IDS),
  })
  .strict()

export const collectionIdSchema = id
