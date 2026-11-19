import {
  MAX_BENEFIT_TITLE,
  MAX_TIER_CAPACITY,
  MAX_TIER_PRICE_TOMAN,
  MAX_TIER_TITLE,
  MIN_TIER_PRICE_TOMAN,
} from '@/features/tiers/schemas/tier'
import type {
  CreateTierPayload,
  Tier,
  TierBenefitPayload,
} from '@/features/tiers/types/tier'
import { toLatinDigits } from '@/lib/digits'

export type DraftBenefit = { key: string; title: string; roleId: number | null }

/** The builder's unsaved form state; the live preview renders from it. */
export type TierDraft = {
  title: string
  description: string
  /** As typed; Persian digits and separators are read by `draftPrice`. */
  price: string
  /** The cover the tier will have, by `POST /tire/cover` id. */
  coverId: string | null
  /** The URL of a cover uploaded in this session; a saved one is read live. */
  uploadedCoverUrl: string | null
  chatEnabled: boolean
  capacityEnabled: boolean
  capacity: string
  benefits: DraftBenefit[]
}

export type TierDraftError =
  'title' | 'price' | 'priceMinimum' | 'capacity' | 'benefits' | 'customBenefit'

export function emptyTierDraft(): TierDraft {
  return {
    title: '',
    description: '',
    price: '',
    coverId: null,
    uploadedCoverUrl: null,
    chatEnabled: false,
    capacityEnabled: false,
    capacity: '',
    benefits: [],
  }
}

export function draftFromTier(tier: Tier): TierDraft {
  return {
    title: tier.title,
    description: tier.description,
    price: String(tier.priceToman),
    coverId: tier.coverId,
    uploadedCoverUrl: null,
    chatEnabled: tier.chatEnabled,
    capacityEnabled: tier.capacity !== null,
    capacity: tier.capacity === null ? '' : String(tier.capacity),
    benefits: tier.benefits.map(({ id, title, roleId }) => ({
      key: `existing-${id}`,
      title,
      roleId,
    })),
  }
}

/** A whole number typed with any digits and group separators, or null. */
function wholeNumber(value: string, max: number): number | null {
  const text = toLatinDigits(value).replace(/[\s,٬،]/g, '')
  if (!/^\d{1,15}$/.test(text)) return null
  const number = Number(text)
  return Number.isSafeInteger(number) && number > 0 && number <= max
    ? number
    : null
}

/** The typed price as integer Toman, or null. Reads the input; computes nothing. */
export function draftPrice(value: string): number | null {
  return wholeNumber(value, MAX_TIER_PRICE_TOMAN)
}

/** The typed member limit, or null. */
export function draftCapacity(value: string): number | null {
  return wholeNumber(value, MAX_TIER_CAPACITY)
}

/** Every reason the draft cannot be saved, in form order. */
export function draftErrors(draft: TierDraft): TierDraftError[] {
  const errors: TierDraftError[] = []
  const title = draft.title.trim()
  if (!title || title.length > MAX_TIER_TITLE) errors.push('title')
  const price = draftPrice(draft.price)
  if (price === null) errors.push('price')
  else if (price < MIN_TIER_PRICE_TOMAN) errors.push('priceMinimum')
  if (draft.capacityEnabled && draftCapacity(draft.capacity) === null) {
    errors.push('capacity')
  }
  if (
    draft.benefits.some(
      ({ title: text }) =>
        !text.trim() || text.trim().length > MAX_BENEFIT_TITLE
    )
  ) {
    errors.push('benefits')
  }
  // A custom-only row (no template) cannot be written back until BE-TIER-06.
  if (draft.benefits.some(({ roleId }) => roleId === null)) {
    errors.push('customBenefit')
  }
  return errors
}

/**
 * The body both writes share, or null while `draftErrors` reports anything.
 * The cover is added by `coverForCreate` or `coverChange`.
 */
export function payloadFromDraft(
  draft: TierDraft
): Omit<CreateTierPayload, 'coverTireId'> | null {
  if (draftErrors(draft).length > 0) return null
  const price = draftPrice(draft.price)
  if (price === null) return null
  const benefits: TierBenefitPayload[] = []
  for (const { title, roleId } of draft.benefits) {
    if (roleId === null) return null
    benefits.push({ title: title.trim(), roleId })
  }
  const capacity = draft.capacityEnabled ? draftCapacity(draft.capacity) : null
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    price,
    chatEnabled: draft.chatEnabled,
    tireAdvanced:
      capacity === null
        ? { limitedUser: false }
        : { limitedUser: true, limitNumberUser: capacity },
    benefits,
  }
}

/** For `POST`: the uploaded cover's id, or nothing. */
export function coverForCreate(draft: TierDraft): { coverTireId?: string } {
  return draft.coverId === null ? {} : { coverTireId: draft.coverId }
}

/**
 * For `PUT`: the cover is sent only when it changed — a new id, or `null` to
 * remove it. Sending the unchanged id is harmless but says nothing.
 */
export function coverChange(
  draft: TierDraft,
  saved: Tier
): { coverTireId?: string | null } {
  return draft.coverId === saved.coverId ? {} : { coverTireId: draft.coverId }
}
