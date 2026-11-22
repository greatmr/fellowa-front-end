import { z } from 'zod'

import type {
  CreatorCollection,
  CreatorLink,
  CreatorPost,
  CreatorPostPage,
  CreatorProfile,
  CreatorTier,
} from '@/features/creator-page/types/creator-page'
import { parseTierPrice } from '@/features/tiers'
import { parseEnvelope } from '@/lib/api/envelope'
import { postBodyFromApi } from '@/lib/post-body'
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

// ---- Raw responses (BE-LAND-03, Q-51) --------------------------------------------

const rawProfileSchema = z.object({
  id,
  alias: z.string().nullable(),
  /** BE-USER-07 (FQ-17): the public name; `null` or absent means none yet. */
  pageName: z.string().nullish(),
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
  /** BE-LAND-09; absent from an older backend, which reads as anonymous. */
  viewer: z.object({ isFollowing: z.boolean() }).nullish(),
  /** BE-LAND-10: only `GET /landing/me/page` sends it. */
  isPublished: z.boolean().optional(),
})

const rawTierSchema = z.object({
  id,
  title: z.string(),
  description: z.string().nullable(),
  price: z.union([z.number(), z.string()]),
  cover: url,
  benefits: z.array(z.object({ id, title: z.string() })),
})

// Q-51 `PublicPost` (BE-CONT-13 adds `creatorId`). Only the keys the list
// shows; zod drops the rest (media on FULL, tags), so an extra key never
// travels further than this parse.
const postBase = {
  id,
  /** The page that owns the post; checked against the page being shown. */
  creatorId: id,
  title: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  /** BE-CONT-14; absent from an older server, whose bodies are all plain. */
  bodyFormat: z.enum(['plain', 'html']).optional(),
}

const rawPostSchema = z.discriminatedUnion('access', [
  z.object({
    ...postBase,
    access: z.literal('FULL'),
    text: z.string().nullable(),
  }),
  z.object({
    ...postBase,
    access: z.literal('PARTIAL'),
    /** Absent when the paywall sits at 0 (Q-19). */
    text: z.string().optional(),
  }),
  z.object({
    ...postBase,
    access: z.literal('TEASER'),
    /** Absent when the owner typed none. */
    textPreview: z.string().optional(),
  }),
])

const rawPostPageSchema = z.object({
  items: z.array(rawPostSchema),
  page: z.object({
    count: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    next: z.number().int().positive().nullable(),
  }),
})

export function parseCreatorProfile(value: unknown): CreatorProfile {
  return toCreatorProfile(parseEnvelope(rawProfileSchema, value, invalid))
}

/**
 * `GET /landing/me/page` (BE-LAND-10): the public profile shape plus
 * `isPublished`, which this route always sends; without it the answer is not
 * the owner's preview and is refused.
 */
export function parseOwnCreatorPage(value: unknown): {
  profile: CreatorProfile
  isPublished: boolean
} {
  const raw = parseEnvelope(rawProfileSchema, value, invalid)
  if (raw.isPublished === undefined) throw invalid()
  return { profile: toCreatorProfile(raw), isPublished: raw.isPublished }
}

function toCreatorProfile(
  raw: z.infer<typeof rawProfileSchema>
): CreatorProfile {
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
    pageName: raw.pageName ?? null,
    avatarUrl: raw.avatar,
    coverUrl: raw.header,
    bio: about?.bio ?? null,
    categoryId: raw.categoryId,
    followerCount: followers,
    links: links.filter((link): link is CreatorLink => link !== null),
    viewerFollows: raw.viewer?.isFollowing ?? null,
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

/**
 * `GET /landing/creators/:id/posts`. A post of another page is a backend
 * defect, refused rather than shown under this creator's name.
 */
export function parseCreatorPostPage(
  value: unknown,
  creatorId: number
): CreatorPostPage {
  const raw = parseEnvelope(rawPostPageSchema, value, invalid)
  if (raw.items.some((post) => post.creatorId !== creatorId)) throw invalid()
  const items = raw.items.map((post): CreatorPost => {
    const common = { id: post.id, title: post.title, createdAt: post.createdAt }
    const format = post.bodyFormat ?? 'plain'
    switch (post.access) {
      case 'FULL':
        return {
          ...common,
          access: 'FULL',
          body: postBodyFromApi(post.text, format),
        }
      case 'PARTIAL':
        return {
          ...common,
          access: 'PARTIAL',
          body: postBodyFromApi(post.text, format),
        }
      case 'TEASER':
        return {
          ...common,
          access: 'TEASER',
          textPreview: post.textPreview || null,
        }
    }
  })
  return { items, total: raw.page.total, nextPage: raw.page.next }
}

const rawCollectionSchema = z.object({
  id,
  title: z.string(),
  description: z.string().nullable(),
  postCount: z.number().int().nonnegative(),
})

/** `GET /landing/creators/:id/collections`: newest first. */
export function parseCreatorCollections(value: unknown): CreatorCollection[] {
  return parseEnvelope(z.array(rawCollectionSchema), value, invalid)
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
