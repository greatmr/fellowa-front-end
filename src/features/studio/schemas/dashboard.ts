import { z } from 'zod'

import type { SetupFacts, SetupStep } from '@/features/studio/types/dashboard'
import { parseEnvelope } from '@/lib/api/envelope'

export class InvalidDashboardResponseError extends Error {
  constructor() {
    super('Invalid dashboard response')
    this.name = 'InvalidDashboardResponseError'
  }
}

const invalid = () => new InvalidDashboardResponseError()

// ---- Raw responses (only the keys the checklist reads) ---------------------
// Unknown keys are dropped on parse, so email and personal data in the
// profile never reach the page.

/** `GET /user/:id/profile` (owner shape). */
const profileSchema = z.object({
  alias: z.string().nullish(),
  isPublish: z.boolean(),
})
/** `GET /user/payment`: the IBAN destination. */
const paymentSchema = z.object({ ibanNumber: z.string().nullish() })
const rowsSchema = z.array(z.object({ id: z.number() }))

export function parseProfileFacts(value: unknown): {
  username: string | null
  isPublished: boolean
} {
  const raw = parseEnvelope(profileSchema, value, invalid)
  const username = raw.alias?.trim()
  return { username: username ? username : null, isPublished: raw.isPublish }
}

/** `GET /tire` and `GET /content` are lists; the checklist needs "any". */
export function parseHasRows(value: unknown): boolean {
  return parseEnvelope(rowsSchema, value, invalid).length > 0
}

export function parseHasPayoutDetails(value: unknown): boolean {
  const raw = parseEnvelope(paymentSchema, value, invalid)
  return Boolean(raw.ibanNumber?.trim())
}

/**
 * The five steps and whether each is done, derived from real rows — never a
 * stored progress counter (CP-04). "Basics" is the claimed username: it is the
 * one thing the backend requires before it creates the page (`PUT
 * /user/publish` answers 400 `USER_ALIAS_REQUIRED` without it).
 */
export function deriveSetupSteps(facts: SetupFacts): SetupStep[] {
  return [
    { id: 'basics', done: facts.username !== null },
    { id: 'firstTier', done: facts.hasTier },
    { id: 'firstPost', done: facts.hasPost },
    { id: 'payout', done: facts.hasPayoutDetails },
    { id: 'publish', done: facts.isPublished },
  ]
}

/**
 * A page needs a username and something to sell before it goes live (CP-05).
 * This only decides whether the button is offered; the backend still answers
 * for the publish itself.
 */
export function publishBlockedBy(
  facts: SetupFacts
): 'basics' | 'firstTier' | null {
  if (facts.username === null) return 'basics'
  if (!facts.hasTier) return 'firstTier'
  return null
}
