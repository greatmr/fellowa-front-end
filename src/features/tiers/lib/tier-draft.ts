import { MAX_TIER_PRICE_TOMAN } from '@/features/tiers/schemas/tier'
import type {
  CreateTierPayload,
  Tier,
  TierBenefitPayload,
} from '@/features/tiers/types/tier'

export type TierDraft = {
  title: string
  description: string
  price: string
  benefits: { key: string; title: string; roleId: string }[]
}

export function emptyTierDraft(): TierDraft {
  return { title: '', description: '', price: '', benefits: [] }
}

export function draftFromTier(tier: Tier): TierDraft {
  return {
    title: tier.title,
    description: tier.description,
    price: String(tier.priceToman),
    benefits: tier.benefits.map(({ id, title, roleId }) => ({
      key: `existing-${id}`,
      title,
      roleId: String(roleId),
    })),
  }
}

/** Reject fractional, unsafe, or out-of-range money before it reaches the API. */
export function validPriceInput(value: string): boolean {
  if (!/^\d{1,10}$/.test(value)) return false
  const price = Number(value)
  return price > 0 && price <= MAX_TIER_PRICE_TOMAN
}

export function payloadFromDraft(draft: TierDraft): CreateTierPayload | null {
  if (!validPriceInput(draft.price)) return null
  const title = draft.title.trim()
  if (!title || title.length > 255) return null
  const benefits: TierBenefitPayload[] = []
  for (const item of draft.benefits) {
    const benefitTitle = item.title.trim()
    const roleId = Number(item.roleId)
    if (
      !benefitTitle ||
      benefitTitle.length > 255 ||
      !Number.isSafeInteger(roleId) ||
      roleId <= 0
    ) {
      return null
    }
    benefits.push({ title: benefitTitle, roleId })
  }
  return {
    title,
    description: draft.description.trim(),
    price: Number(draft.price),
    benefits,
  }
}
