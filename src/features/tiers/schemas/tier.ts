import { z } from 'zod'

import type { Tier, TierCover, TierRole } from '@/features/tiers/types/tier'
import { parseEnvelope } from '@/lib/api/envelope'
import { httpUrlOrNull } from '@/lib/url'

// ---- Limits from the backend DTOs (`back-end/src/modules/tier/dto`) --------

/** `CreateTireDto.price` @Max: the most `tier.price_toman` numeric(12,0) holds. */
export const MAX_TIER_PRICE_TOMAN = 999_999_999_999
/** `tier.title` varchar(120). */
export const MAX_TIER_TITLE = 120
/** `tier_benefit.custom_title` varchar(160). */
export const MAX_BENEFIT_TITLE = 160
/** `benefit_template.id` smallint. */
const MAX_ROLE_ID = 32_767
/** `tier.capacity_limit` integer. */
export const MAX_TIER_CAPACITY = 2_147_483_647

/**
 * The lowest monthly price: `MIN_TIER_PRICE` in the backend's
 * `create-tire.dto.ts` (BE-TIER-06, FQ-12). The server enforces it with 400
 * `TIER_PRICE_BELOW_MINIMUM`; the builder hints it and checks it first as UX.
 */
export const MIN_TIER_PRICE_TOMAN = 100_000

/** Price shortcut chips and the guide's price step (FQ-12): input shortcuts only. */
export const TIER_PRICE_SHORTCUTS = [
  100_000, 150_000, 200_000, 350_000, 500_000,
] as const

/** `TIER_COVER_ID` in `tier-cover.ts`: the last segment of the object key. */
const TIER_COVER_ID = /^\d+-[0-9a-f]{12}\.[a-z0-9]+$/

/** `IMAGE_UPLOAD.types`: raster images only. */
export const TIER_COVER_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export class InvalidTierResponseError extends Error {
  constructor() {
    super('Invalid tier response')
    this.name = 'InvalidTierResponseError'
  }
}

const id = z.number().int().positive().safe()

// ---- Raw responses (what the backend sends) --------------------------------

/**
 * `roleId` is `null` for a custom benefit (BE-TIER-06); `title` is nullable in
 * the column. One such row must not throw away the whole list.
 */
const rawBenefitSchema = z.object({
  id,
  title: z.string().nullable(),
  roleId: id.nullable(),
})
const rawTierSchema = z.object({
  id,
  title: z.string(),
  description: z.string().nullish(),
  price: z.union([z.number(), z.string()]),
  chatEnabled: z.boolean(),
  // `GET /tire`: `{id, tireId, image, url}`; `image` is the storage key and
  // `url` (BE-TIER-07) is a string whenever `cover` is an object.
  cover: z.object({ id: z.string().min(1), url: z.string().min(1) }).nullable(),
  // `GET /tire`: `[]` for no limit, one row otherwise.
  advanced: z.array(z.object({ limitNumberUser: id })),
  benefits: z.array(rawBenefitSchema),
  // Owner-only, on `GET /tire` (BE-TIER-06).
  seatsTaken: z.number().int().nonnegative().safe(),
})
const roleSchema = z.object({
  id,
  title: z.string(),
  persianTitle: z.string().nullish(),
})
const coverSchema = z.object({ id: z.string().min(1), url: z.string().min(1) })

/**
 * Without object storage the server's `buildUrl` returns the bare key
 * (`patreon/file/…`). Such a cover keeps its id, so saving the tier does not
 * drop it, but has no URL to draw (FE-TIER-04).
 */
function toCover(raw: { id: string; url: string }): TierCover {
  return { id: raw.id, url: httpUrlOrNull(raw.url) }
}

const invalid = () => new InvalidTierResponseError()

/** Prices may arrive as numeric strings; never round or scale chargeable money. */
export function parseTierPrice(value: number | string): number {
  const text = typeof value === 'number' ? String(value) : value.trim()
  if (!/^\d+(?:\.0+)?$/.test(text)) throw invalid()
  const price = Number(text.split('.')[0])
  if (!Number.isSafeInteger(price) || price <= 0) throw invalid()
  return price
}

export function parseTierList(value: unknown): Tier[] {
  const rows = parseEnvelope(z.array(rawTierSchema), value, invalid)
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    priceToman: parseTierPrice(row.price),
    chatEnabled: row.chatEnabled,
    capacity: row.advanced[0]?.limitNumberUser ?? null,
    cover: row.cover ? toCover(row.cover) : null,
    benefits: row.benefits.map((benefit) => ({
      id: benefit.id,
      title: benefit.title ?? '',
      roleId: benefit.roleId,
    })),
    seatsTaken: row.seatsTaken,
  }))
}

export function parseTierRoles(value: unknown): TierRole[] {
  return parseEnvelope(z.array(roleSchema), value, invalid)
}

/** `POST /tire/cover`. */
export function parseTierCoverUpload(value: unknown): TierCover {
  return toCover(parseEnvelope(coverSchema, value, invalid))
}

export function parseTierWrite(value: unknown): number {
  return parseEnvelope(z.object({ id }), value, invalid).id
}

export function parseTierDelete(value: unknown): void {
  parseEnvelope(z.object({ message: z.string() }), value, invalid)
}

// ---- Request input (validated again on the server before it is forwarded) --

export const tierIdSchema = id

/** A preset (`roleId`) or a custom benefit (no `roleId`, BE-TIER-06). */
const benefitInputSchema = z.object({
  title: z.string().trim().min(1).max(MAX_BENEFIT_TITLE),
  roleId: id.max(MAX_ROLE_ID).optional(),
})

const advancedInputSchema = z.object({
  limitedUser: z.boolean(),
  limitNumberUser: id.max(MAX_TIER_CAPACITY).optional(),
})

const coverIdSchema = z.string().regex(TIER_COVER_ID)

export const tierInputSchema = z.object({
  title: z.string().trim().min(1).max(MAX_TIER_TITLE),
  description: z.string().trim().optional(),
  price: z.number().int().positive().safe().max(MAX_TIER_PRICE_TOMAN),
  chatEnabled: z.boolean().optional(),
  tireAdvanced: advancedInputSchema.optional(),
  benefits: z.array(benefitInputSchema).optional(),
  coverTireId: coverIdSchema.optional(),
})

export const tierUpdateInputSchema = tierInputSchema.extend({
  id,
  price: tierInputSchema.shape.price.optional(),
  coverTireId: coverIdSchema.nullable().optional(),
})
