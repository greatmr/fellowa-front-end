/**
 * Tier shapes. The backend still calls a tier `Tire`; that name stays inside
 * `api/tier-api.ts` (routes) and `schemas/tier.ts` (raw responses).
 */
export type TierBenefit = { id: number; title: string; roleId: number }

export type Tier = {
  id: number
  title: string
  description: string
  priceToman: number
  benefits: TierBenefit[]
}

export type TierRole = {
  id: number
  title: string
  persianTitle?: string | null
}

export type TierBenefitPayload = { title: string; roleId: number }

export type CreateTierPayload = {
  title: string
  description?: string
  price: number
  benefits?: TierBenefitPayload[]
}

export type UpdateTierPayload = Partial<CreateTierPayload>
