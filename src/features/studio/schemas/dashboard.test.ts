import { describe, expect, it } from 'vitest'

import {
  InvalidDashboardResponseError,
  deriveSetupSteps,
  parseHasPayoutDetails,
  parseHasRows,
  parseProfileFacts,
  publishBlockedBy,
} from '@/features/studio/schemas/dashboard'
import type { SetupFacts } from '@/features/studio/types/dashboard'

const none: SetupFacts = {
  username: null,
  hasTier: false,
  hasPost: false,
  hasPayoutDetails: false,
  isPublished: false,
}
const envelope = (data: unknown) => ({ data, errors: null })

describe('parseProfileFacts', () => {
  it('keeps the username and publish flag and drops personal data', () => {
    const facts = parseProfileFacts(
      envelope({
        id: 42,
        email: 'me@example.com',
        alias: ' sara ',
        isPublish: true,
        personal: { phoneNumber: '09121234567' },
      })
    )

    expect(facts).toEqual({ username: 'sara', isPublished: true })
  })

  it('treats a missing or blank alias as no username', () => {
    expect(
      parseProfileFacts(envelope({ alias: null, isPublish: false })).username
    ).toBeNull()
    expect(
      parseProfileFacts(envelope({ alias: '  ', isPublish: false })).username
    ).toBeNull()
  })

  it('rejects a response without the publish flag', () => {
    expect(() => parseProfileFacts(envelope({ alias: 'sara' }))).toThrow(
      InvalidDashboardResponseError
    )
  })
})

describe('parseHasRows / parseHasPayoutDetails', () => {
  it('is true only for a non-empty list', () => {
    expect(parseHasRows(envelope([]))).toBe(false)
    expect(parseHasRows(envelope([{ id: 7, title: 'Gold' }]))).toBe(true)
  })

  it('rejects a list that is not one', () => {
    expect(() => parseHasRows(envelope({ id: 7 }))).toThrow(
      InvalidDashboardResponseError
    )
  })

  it('needs a non-blank IBAN', () => {
    expect(parseHasPayoutDetails(envelope({ ibanNumber: 'IR1234' }))).toBe(true)
    expect(parseHasPayoutDetails(envelope({ ibanNumber: ' ' }))).toBe(false)
    expect(parseHasPayoutDetails(envelope({ ibanNumber: null }))).toBe(false)
  })
})

describe('deriveSetupSteps', () => {
  it('lists the five CP-04 steps in order, all open for a new account', () => {
    expect(deriveSetupSteps(none)).toEqual([
      { id: 'basics', done: false },
      { id: 'firstTier', done: false },
      { id: 'firstPost', done: false },
      { id: 'payout', done: false },
      { id: 'publish', done: false },
    ])
  })

  it('marks each step from its own fact', () => {
    const steps = deriveSetupSteps({
      username: 'sara',
      hasTier: true,
      hasPost: false,
      hasPayoutDetails: true,
      isPublished: false,
    })

    expect(steps.map((s) => s.done)).toEqual([true, true, false, true, false])
  })
})

describe('publishBlockedBy (CP-05)', () => {
  it('asks for a username first, then a tier', () => {
    expect(publishBlockedBy(none)).toBe('basics')
    expect(publishBlockedBy({ ...none, username: 'sara' })).toBe('firstTier')
  })

  it('does not block with a username and a tier', () => {
    expect(
      publishBlockedBy({ ...none, username: 'sara', hasTier: true })
    ).toBeNull()
  })
})
