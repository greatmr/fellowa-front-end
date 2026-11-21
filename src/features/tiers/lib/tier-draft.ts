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
  /** That cover's URL, saved or uploaded in this session. */
  coverUrl: string | null
  chatEnabled: boolean
  capacityEnabled: boolean
  capacity: string
  benefits: DraftBenefit[]
}

export type TierDraftError =
  'title' | 'price' | 'priceMinimum' | 'capacity' | 'benefits'

export function emptyTierDraft(): TierDraft {
  return {
    title: '',
    description: '',
    price: '',
    coverId: null,
    coverUrl: null,
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
    coverId: tier.cover?.id ?? null,
    coverUrl: tier.cover?.url ?? null,
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

/**
 * Every reason the draft cannot be saved, in form order. `savedPrice` is the
 * edited tier's stored price: the server checks the minimum only on a price
 * that is sent, and an unchanged price is not sent (`priceChange`).
 */
export function draftErrors(
  draft: TierDraft,
  savedPrice?: number
): TierDraftError[] {
  const errors: TierDraftError[] = []
  const title = draft.title.trim()
  if (!title || title.length > MAX_TIER_TITLE) errors.push('title')
  const price = draftPrice(draft.price)
  if (price === null) errors.push('price')
  else if (price < MIN_TIER_PRICE_TOMAN && price !== savedPrice) {
    errors.push('priceMinimum')
  }
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
  return errors
}

/**
 * The body both writes share, or null while `draftErrors` reports anything.
 * The cover is added by `coverForCreate` or `coverChange`.
 */
export function payloadFromDraft(
  draft: TierDraft,
  savedPrice?: number
): Omit<CreateTierPayload, 'coverTireId'> | null {
  if (draftErrors(draft, savedPrice).length > 0) return null
  const price = draftPrice(draft.price)
  if (price === null) return null
  // Array order is the saved order (`sort_order`); no `roleId` is custom.
  const benefits: TierBenefitPayload[] = draft.benefits.map(
    ({ title, roleId }) =>
      roleId === null
        ? { title: title.trim() }
        : { title: title.trim(), roleId }
  )
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

/** For `PUT`: the price only when it changed, so an untouched one is not re-checked. */
export function priceChange(price: number, saved: Tier): { price?: number } {
  return price === saved.priceToman ? {} : { price }
}

/** Moves one benefit by `offset` places; the array order is what is saved. */
export function moveBenefit(
  benefits: DraftBenefit[],
  index: number,
  offset: -1 | 1
): DraftBenefit[] {
  const target = index + offset
  if (target < 0 || target >= benefits.length) return benefits
  const next = [...benefits]
  const [item] = next.splice(index, 1)
  if (item) next.splice(target, 0, item)
  return next
}

/**
 * Appends a benefit unless one with the same trimmed title is already listed
 * (presentation `TiersView` @ d843c3b): a duplicate add is ignored.
 */
export function addBenefit(
  benefits: DraftBenefit[],
  benefit: DraftBenefit
): DraftBenefit[] {
  const title = benefit.title.trim()
  return benefits.some((existing) => existing.title.trim() === title)
    ? benefits
    : [...benefits, benefit]
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
  return draft.coverId === (saved.cover?.id ?? null)
    ? {}
    : { coverTireId: draft.coverId }
}
