/**
 * Tier shapes. The backend still calls a tier `Tire`; that name stays inside
 * `api/tier-api.ts` (routes) and `schemas/tier.ts` (raw responses).
 */

/**
 * `roleId` is `tier_benefit.template_id`, which is nullable: a custom-only
 * row exists in the schema (`tier_benefit_source`), even though no route
 * writes one before BE-TIER-06.
 */
export type TierBenefit = { id: number; title: string; roleId: number | null }

export type Tier = {
  id: number
  title: string
  description: string
  priceToman: number
  /** Q-69: whether this tier's members may chat with the page owner. */
  chatEnabled: boolean
  /** `tier.capacity_limit`; `null` is unlimited (O-19). */
  capacity: number | null
  /**
   * `GET /tire` gives the cover's id only as a usable value: its `image` is
   * the storage key, not a URL. The URL comes from `GET /tire/:id`.
   */
  coverId: string | null
  benefits: TierBenefit[]
}

/** A cover as `POST /tire/cover` and `GET /tire/:id` give it. */
export type TierCover = { id: string; url: string }

export type TierRole = {
  id: number
  title: string
  persianTitle?: string | null
}

export type TierBenefitPayload = { title: string; roleId: number }

/** `tireAdvanced`: `limitedUser: false` (or no number) stores no limit. */
export type TierAdvancedPayload = {
  limitedUser: boolean
  limitNumberUser?: number
}

export type CreateTierPayload = {
  title: string
  description?: string
  price: number
  chatEnabled?: boolean
  tireAdvanced?: TierAdvancedPayload
  benefits?: TierBenefitPayload[]
  /** The id `POST /tire/cover` returned; left out for no cover. */
  coverTireId?: string
}

export type UpdateTierPayload = Omit<CreateTierPayload, 'coverTireId'> & {
  id: number
  /** Left out: unchanged. `null`: remove the cover. */
  coverTireId?: string | null
}
