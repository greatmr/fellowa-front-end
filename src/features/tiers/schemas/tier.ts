import { z } from 'zod'

import type { Tier, TierCover, TierRole } from '@/features/tiers/types/tier'
import { parseEnvelope } from '@/lib/api/envelope'

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
 * The lowest monthly price, 100,000 Toman (FQ-12, owner 2026-11-19). The rule
 * belongs to the server (BE-TIER-06); until it ships the builder hints and
 * checks it as UX only. Part B maps the server's 400 onto the same message.
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

/**
 * The cover travels through a server action, whose body Next caps at 1 MB by
 * default (`serverActions.bodySizeLimit`). The backend accepts up to its own
 * provisional 10 MB; this is the smaller of the two, with room for the
 * multipart envelope.
 */
export const MAX_TIER_COVER_BYTES = 900 * 1024

export class InvalidTierResponseError extends Error {
  constructor() {
    super('Invalid tier response')
    this.name = 'InvalidTierResponseError'
  }
}

const id = z.number().int().positive().safe()

// ---- Raw responses (what the backend sends) --------------------------------

/**
 * `roleId` (template) and `title` (custom title) are each nullable in
 * `tier_benefit`; one such row must not throw away the whole list.
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
  // `GET /tire`: `{id, tireId, image}` where `image` is the storage key.
  cover: z.object({ id: z.string() }).nullable(),
  // `GET /tire`: `[]` for no limit, one row otherwise.
  advanced: z.array(z.object({ limitNumberUser: id })),
  benefits: z.array(rawBenefitSchema),
})
const roleSchema = z.object({
  id,
  title: z.string(),
  persianTitle: z.string().nullish(),
})
const coverSchema = z.object({ id: z.string().min(1), url: z.string().min(1) })

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
    coverId: row.cover?.id ?? null,
    benefits: row.benefits.map((benefit) => ({
      id: benefit.id,
      title: benefit.title ?? '',
      roleId: benefit.roleId,
    })),
  }))
}

export function parseTierRoles(value: unknown): TierRole[] {
  return parseEnvelope(z.array(roleSchema), value, invalid)
}

/** `GET /tire/:id`: only the cover is read, for its URL. */
export function parseTierDetailCover(value: unknown): TierCover | null {
  return parseEnvelope(
    z.object({ cover: coverSchema.nullable() }),
    value,
    invalid
  ).cover
}

/** `POST /tire/cover`. */
export function parseTierCoverUpload(value: unknown): TierCover {
  return parseEnvelope(coverSchema, value, invalid)
}

export function parseTierWrite(value: unknown): number {
  return parseEnvelope(z.object({ id }), value, invalid).id
}

export function parseTierDelete(value: unknown): void {
  parseEnvelope(z.object({ message: z.string() }), value, invalid)
}

// ---- Request input (validated again on the server before it is forwarded) --

export const tierIdSchema = id

const benefitInputSchema = z.object({
  title: z.string().trim().min(1).max(MAX_BENEFIT_TITLE),
  roleId: id.max(MAX_ROLE_ID),
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
  coverTireId: coverIdSchema.nullable().optional(),
})
