import { describe, expect, it } from 'vitest'

import {
  draftFromTier,
  emptyTierDraft,
  payloadFromDraft,
  validPriceInput,
} from '@/features/tiers/lib/tier-draft'

describe('validPriceInput', () => {
  it.each(['1', '50000', '9999999999'])('accepts %s', (value) => {
    expect(validPriceInput(value)).toBe(true)
  })
  it.each(['', '0', '-5', '1.5', '1e3', '10000000000', ' 5', 'abc'])(
    'rejects %j',
    (value) => {
      expect(validPriceInput(value)).toBe(false)
    }
  )
})

describe('payloadFromDraft', () => {
  const draft = {
    ...emptyTierDraft(),
    title: ' Gold ',
    description: ' Perks ',
    price: '50000',
    benefits: [{ key: 'new-0', title: ' Chat ', roleId: '3' }],
  }

  it('trims text and keeps the price as an integer Toman amount', () => {
    expect(payloadFromDraft(draft)).toEqual({
      title: 'Gold',
      description: 'Perks',
      price: 50000,
      benefits: [{ title: 'Chat', roleId: 3 }],
    })
  })

  it.each([
    ['a blank title', { title: '  ' }],
    ['a zero price', { price: '0' }],
    [
      'a benefit without a role',
      {
        benefits: [{ key: 'k', title: 'Chat', roleId: '' }],
      },
    ],
    [
      'a benefit without a title',
      {
        benefits: [{ key: 'k', title: ' ', roleId: '3' }],
      },
    ],
  ])('returns null for %s', (_name, patch) => {
    expect(payloadFromDraft({ ...draft, ...patch })).toBeNull()
  })
})

describe('draftFromTier', () => {
  it('round-trips an existing tier through the editor draft', () => {
    const tier = {
      id: 7,
      title: 'Supporter',
      description: '',
      priceToman: 50000,
      benefits: [{ id: 2, title: 'Chat', roleId: 3 }],
    }
    expect(draftFromTier(tier)).toEqual({
      title: 'Supporter',
      description: '',
      price: '50000',
      benefits: [{ key: 'existing-2', title: 'Chat', roleId: '3' }],
    })
  })
})
