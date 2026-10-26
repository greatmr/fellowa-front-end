import { z } from 'zod'

const id = z.number().int().positive().safe()
const benefitSchema = z.object({
  id,
  title: z.string(),
  roleId: id,
})
const rawTierSchema = z.object({
  id,
  title: z.string(),
  description: z.string().nullish(),
  price: z.union([z.number(), z.string()]),
  benefits: z.array(benefitSchema),
})
const roleSchema = z.object({
  id,
  title: z.string(),
  persianTitle: z.string().nullish(),
})

export type Tier = {
  id: number
  title: string
  description: string
  priceToman: number
  benefits: { id: number; title: string; roleId: number }[]
}

export type TierRole = z.infer<typeof roleSchema>
export type TierBenefitPayload = { title: string; roleId: number }
export type CreateTierPayload = {
  title: string
  description?: string
  price: number
  benefits?: TierBenefitPayload[]
}
export type UpdateTierPayload = Partial<CreateTierPayload>

export class InvalidTierResponseError extends Error {
  constructor() {
    super('Invalid tier response')
    this.name = 'InvalidTierResponseError'
  }
}

function parseEnvelope<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = z.object({ data: schema, errors: z.null() }).safeParse(value)
  if (!result.success) throw new InvalidTierResponseError()
  return result.data.data
}

/** TypeORM decimal prices may be strings; never round or scale chargeable money. */
export function parseTierPrice(value: number | string): number {
  const text = typeof value === 'number' ? String(value) : value.trim()
  if (!/^\d+(?:\.0+)?$/.test(text)) throw new InvalidTierResponseError()
  const price = Number(text.split('.')[0])
  if (!Number.isSafeInteger(price) || price <= 0) {
    throw new InvalidTierResponseError()
  }
  return price
}

export function parseTierList(value: unknown): Tier[] {
  const rows = parseEnvelope(z.array(rawTierSchema), value)
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    priceToman: parseTierPrice(row.price),
    benefits: row.benefits,
  }))
}

export function parseTierRoles(value: unknown): TierRole[] {
  return parseEnvelope(z.array(roleSchema), value)
}

export function parseTierWrite(value: unknown): number {
  return parseEnvelope(z.object({ id }), value).id
}

export function parseTierDelete(value: unknown): void {
  parseEnvelope(z.object({ message: z.string() }), value)
}
