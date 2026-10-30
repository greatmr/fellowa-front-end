import { z } from 'zod'

import type {
  CreatorLink,
  CreatorPost,
  CreatorProfile,
  CreatorTier,
} from '@/features/creator-page/types/creator-page'
import { parseTierPrice } from '@/features/tiers'
import { parseEnvelope } from '@/lib/api/envelope'
import { httpUrlOrNull } from '@/lib/url'

export class InvalidCreatorPageResponseError extends Error {
  constructor() {
    super('Invalid creator page response')
    this.name = 'InvalidCreatorPageResponseError'
  }
}

const invalid = () => new InvalidCreatorPageResponseError()
const id = z.number().int().positive().safe()
/** A link or image that is not absolute http(s) is dropped, never rendered. */
const url = z.string().nullish().transform(httpUrlOrNull)

// ---- Raw responses (BE-LAND-03) --------------------------------------------

const rawProfileSchema = z.object({
  id,
  alias: z.string().nullable(),
  avatar: url,
  header: url,
  about: z
    .object({
      bio: z.string().nullable(),
      videoUrl: url,
      facebookLink: url,
      instagramLink: url,
      twitterLink: url,
      youtubeLink: url,
    })
    .nullable(),
  categoryId: id.nullable(),
  /** COUNT(...) arrives from PostgreSQL as a numeric string. */
  numFollowers: z.string().regex(/^\d+$/),
})

const rawTierSchema = z.object({
  id,
  title: z.string(),
  description: z.string().nullable(),
  price: z.union([z.number(), z.string()]),
  cover: url,
  benefits: z.array(z.object({ id, title: z.string() })),
})

const rawPostSchema = z.object({
  id,
  title: z.string(),
  text: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  access: z.literal('FULL'),
})

export function parseCreatorProfile(value: unknown): CreatorProfile {
  const raw = parseEnvelope(rawProfileSchema, value, invalid)
  const followers = Number(raw.numFollowers)
  if (!Number.isSafeInteger(followers)) throw invalid()
  const about = raw.about
  const links: (CreatorLink | null)[] = [
    about?.videoUrl ? { kind: 'video', url: about.videoUrl } : null,
    about?.instagramLink
      ? { kind: 'instagram', url: about.instagramLink }
      : null,
    about?.twitterLink ? { kind: 'twitter', url: about.twitterLink } : null,
    about?.youtubeLink ? { kind: 'youtube', url: about.youtubeLink } : null,
    about?.facebookLink ? { kind: 'facebook', url: about.facebookLink } : null,
  ]
  return {
    id: raw.id,
    alias: raw.alias,
    avatarUrl: raw.avatar,
    coverUrl: raw.header,
    bio: about?.bio ?? null,
    categoryId: raw.categoryId,
    followerCount: followers,
    links: links.filter((link): link is CreatorLink => link !== null),
  }
}

export function parseCreatorTiers(value: unknown): CreatorTier[] {
  return parseEnvelope(z.array(rawTierSchema), value, invalid).map((raw) => {
    let priceToman: number
    try {
      priceToman = parseTierPrice(raw.price)
    } catch {
      throw invalid()
    }
    return {
      id: raw.id,
      title: raw.title,
      description: raw.description,
      priceToman,
      coverUrl: raw.cover,
      benefits: raw.benefits,
    }
  })
}

export function parseCreatorPosts(value: unknown): CreatorPost[] {
  return parseEnvelope(z.array(rawPostSchema), value, invalid).map((raw) => ({
    id: raw.id,
    title: raw.title,
    text: raw.text,
    tags: raw.tags ?? [],
    createdAt: raw.createdAt,
  }))
}

/** PostgreSQL `integer` ids; larger values would overflow the backend column. */
const MAX_CREATOR_ID = 2_147_483_647

/**
 * A route segment that is the canonical decimal form of a creator id. No
 * `0x10`, `1e1`, padding, leading zeros or out-of-range values, so one creator
 * has one URL and nothing outside the column range reaches the API.
 */
export const creatorIdSchema = z
  .string()
  .regex(/^[1-9][0-9]{0,9}$/)
  .transform(Number)
  .pipe(z.number().max(MAX_CREATOR_ID))
