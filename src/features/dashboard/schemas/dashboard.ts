import { z } from 'zod'

import type {
  CreatorIdentity,
  DashboardPost,
} from '@/features/dashboard/types/dashboard'
import { parseEnvelope } from '@/lib/api/envelope'
import { httpUrlOrNull } from '@/lib/url'

export class InvalidDashboardResponseError extends Error {
  constructor() {
    super('Invalid dashboard response')
    this.name = 'InvalidDashboardResponseError'
  }
}

const invalid = () => new InvalidDashboardResponseError()

// ---- Raw responses (only the keys the dashboard reads) ---------------------
// Unknown keys are dropped on parse, so email and personal data in the
// profile never reach the page.

/** `GET /user/:id/profile` (owner shape). */
const profileSchema = z.object({
  alias: z.string().nullish(),
  pageName: z.string().nullish(),
  displayName: z.string().nullish(),
  isPublish: z.boolean(),
  images: z
    .object({ profile: z.string().nullish(), header: z.string().nullish() })
    .nullish(),
})
/** `GET /user/payment`: the IBAN destination. */
const paymentSchema = z.object({ ibanNumber: z.string().nullish() })
const rowsSchema = z.array(z.object({ id: z.number() }))
/**
 * `GET /content` items (owner, FULL; `content-format.ts` `formatForOwner`).
 * The route has no like or comment counts, so none are parsed.
 */
const postsSchema = z.array(
  z.object({
    id: z.number(),
    title: z.string(),
    /** `post.body`: plain text, or sanitised HTML when `bodyFormat` is `html`. */
    text: z.string().nullish(),
    /** BE-CONT-14; absent from an older server, whose bodies are all plain. */
    bodyFormat: z.enum(['plain', 'html']).optional(),
    /** BE-CONT-14: the server's plain-text start of the body (owner reads). */
    excerpt: z.string().nullish(),
    createdAt: z.string(),
    paywallPosition: z.number().nullish(),
    visibility: z.object({
      type: z.boolean(),
      datePublished: z.string().nullish(),
    }),
  })
)

const trimmedOrNull = (value: string | null | undefined) =>
  value?.trim() ? value.trim() : null

/** Code points of the body kept for the dashboard's two-line excerpt. */
export const EXCERPT_LENGTH = 200

/**
 * The start of the body, cut in code points so Persian text and emoji are
 * not split into invalid text; the rest of the body never reaches the page.
 */
function excerptOf(text: string | null | undefined): string | null {
  const trimmed = trimmedOrNull(text)
  if (!trimmed) return null
  const points = Array.from(trimmed)
  return points.length > EXCERPT_LENGTH
    ? `${points.slice(0, EXCERPT_LENGTH).join('').trimEnd()}…`
    : trimmed
}

export function parseProfile(value: unknown): {
  username: string | null
  isPublished: boolean
  hasProfileImages: boolean
  identity: CreatorIdentity
} {
  const raw = parseEnvelope(profileSchema, value, invalid)
  const username = trimmedOrNull(raw.alias)
  return {
    username,
    isPublished: raw.isPublish,
    // A stored key counts as set even when storage cannot build a URL for it:
    // the step is about what the owner did, not about rendering it here.
    hasProfileImages: Boolean(
      raw.images?.profile?.trim() && raw.images.header?.trim()
    ),
    identity: {
      pageName: trimmedOrNull(raw.pageName),
      displayName: trimmedOrNull(raw.displayName),
      alias: username,
      avatarUrl: httpUrlOrNull(raw.images?.profile),
    },
  }
}

/** `GET /tire` is a list; the checklist needs "any". */
export function parseHasRows(value: unknown): boolean {
  return parseEnvelope(rowsSchema, value, invalid).length > 0
}

export function parseHasPayoutDetails(value: unknown): boolean {
  const raw = parseEnvelope(paymentSchema, value, invalid)
  return Boolean(raw.ibanNumber?.trim())
}

/** The owner's posts, newest first as the backend orders them. */
export function parseDashboardPosts(value: unknown): DashboardPost[] {
  return parseEnvelope(postsSchema, value, invalid).map((post) => ({
    id: post.id,
    title: post.title,
    // Never markup: the server's excerpt, or a plain body itself. An html
    // body is not stripped here (FE-POST-03).
    excerpt: excerptOf(
      post.excerpt !== undefined
        ? post.excerpt
        : (post.bodyFormat ?? 'plain') === 'plain'
          ? post.text
          : null
    ),
    publishedAt: post.visibility.datePublished ?? null,
    createdAt: post.createdAt,
    audience: !post.visibility.type
      ? 'tiers'
      : post.paywallPosition == null
        ? 'public'
        : 'paywalled',
  }))
}
