import { z } from 'zod'

import type { Tier, TierRole } from '@/features/tiers/types/tier'
import { parseEnvelope } from '@/lib/api/envelope'

export const MAX_TIER_PRICE_TOMAN = 9_999_999_999

export class InvalidTierResponseError extends Error {
  constructor() {
    super('Invalid tier response')
    this.name = 'InvalidTierResponseError'
  }
}

const id = z.number().int().positive().safe()

// ---- Raw responses (what the backend sends) --------------------------------

const rawBenefitSchema = z.object({ id, title: z.string(), roleId: id })
const rawTierSchema = z.object({
  id,
  title: z.string(),
  description: z.string().nullish(),
  price: z.union([z.number(), z.string()]),
  benefits: z.array(rawBenefitSchema),
})
const roleSchema = z.object({
  id,
  title: z.string(),
  persianTitle: z.string().nullish(),
})

const invalid = () => new InvalidTierResponseError()

/** TypeORM decimal prices may be strings; never round or scale chargeable money. */
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
    benefits: row.benefits,
  }))
}

export function parseTierRoles(value: unknown): TierRole[] {
  return parseEnvelope(z.array(roleSchema), value, invalid)
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
  title: z.string().trim().min(1).max(255),
  roleId: id,
})

export const tierInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().optional(),
  price: z.number().int().positive().safe().max(MAX_TIER_PRICE_TOMAN),
  benefits: z.array(benefitInputSchema).optional(),
})

export const tierUpdateInputSchema = tierInputSchema.extend({ id })
