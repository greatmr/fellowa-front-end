import { z } from 'zod'

import type {
  ExploreCategory,
  ExploreCreator,
  ExploreCreatorPage,
} from '@/features/explore/types/creator'
import { parseEnvelope } from '@/lib/api/envelope'

export const MAX_ALIAS_SEARCH_LENGTH = 255

export class InvalidExploreResponseError extends Error {
  constructor() {
    super('Invalid explore response')
    this.name = 'InvalidExploreResponseError'
  }
}

const id = z.number().int().positive().safe()
/**
 * Only an absolute http(s) URL is rendered. Anything else (e.g. the bare
 * object key the backend returns when storage is not configured) becomes
 * `null` for that field instead of failing the whole page.
 */
function httpUrlOrNull(value: string | null): string | null {
  if (value === null) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.href
      : null
  } catch {
    return null
  }
}
const imageUrl = z.string().nullable().transform(httpUrlOrNull)

// ---- Raw response (BE-LAND-06: `PublicProfile`, plus `numFollowers` on /top)

const rawCreatorSchema = z.object({
  id,
  alias: z.string().nullable(),
  avatar: imageUrl,
  header: imageUrl,
  about: z.object({ bio: z.string().nullable() }).nullable(),
  categoryId: id.nullable(),
  /** COUNT(...) arrives from PostgreSQL as a numeric string. */
  numFollowers: z.string().regex(/^\d+$/).optional(),
})

const rawPageSchema = z.object({
  items: z.array(rawCreatorSchema),
  page: z.object({
    count: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    next: z.number().int().positive().nullable(),
  }),
})

const invalid = () => new InvalidExploreResponseError()

function toCreator(raw: z.infer<typeof rawCreatorSchema>): ExploreCreator {
  const followers =
    raw.numFollowers === undefined ? null : Number(raw.numFollowers)
  if (followers !== null && !Number.isSafeInteger(followers)) throw invalid()
  return {
    id: raw.id,
    alias: raw.alias,
    avatarUrl: raw.avatar,
    coverUrl: raw.header,
    bio: raw.about?.bio ?? null,
    categoryId: raw.categoryId,
    followerCount: followers,
  }
}

const rawCategoryListSchema = z.array(
  z.object({ id, title: z.string().min(1) })
)

export function parseExploreCategories(value: unknown): ExploreCategory[] {
  return parseEnvelope(rawCategoryListSchema, value, invalid).map(
    ({ id, title }) => ({ id, title })
  )
}

export function parseExploreCreatorPage(value: unknown): ExploreCreatorPage {
  const raw = parseEnvelope(rawPageSchema, value, invalid)
  return {
    items: raw.items.map(toCreator),
    total: raw.page.total,
    nextPage: raw.page.next,
  }
}

export const exploreQuerySchema = z.object({
  alias: z.string().trim().max(MAX_ALIAS_SEARCH_LENGTH),
  categoryId: id.nullable(),
  page: z.number().int().min(1).max(10_000),
})
