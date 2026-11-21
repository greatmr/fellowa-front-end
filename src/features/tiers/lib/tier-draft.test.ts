import { describe, expect, it } from 'vitest'

import {
  addBenefit,
  coverChange,
  coverForCreate,
  moveBenefit,
  priceChange,
  draftErrors,
  draftFromTier,
  draftPrice,
  emptyTierDraft,
  payloadFromDraft,
  type TierDraft,
} from '@/features/tiers/lib/tier-draft'
import type { Tier } from '@/features/tiers/types/tier'

const coverId = '1712345678-abcdef012345.webp'

const tier: Tier = {
  id: 7,
  title: 'Supporter',
  description: 'Monthly support',
  priceToman: 150000,
  chatEnabled: true,
  capacity: 25,
  cover: { id: coverId, url: `https://cdn.example/${coverId}` },
  benefits: [{ id: 2, title: 'Special posts', roleId: 1 }],
  seatsTaken: 3,
}

function draft(patch: Partial<TierDraft> = {}): TierDraft {
  return {
    ...emptyTierDraft(),
    title: ' Gold ',
    description: ' Perks ',
    price: '150000',
    benefits: [{ key: 'new-0', title: ' Chat ', roleId: 3 }],
    ...patch,
  }
}

describe('draftPrice', () => {
  it.each([
    ['150000', 150000],
    ['150,000', 150000],
    ['۱۵۰٬۰۰۰', 150000],
    ['999999999999', 999999999999],
  ])('reads %j as integer Toman', (value, expected) => {
    expect(draftPrice(value)).toBe(expected)
  })

  it.each(['', '0', '-5', '1.5', '1e3', '1000000000000', 'abc'])(
    'rejects %j',
    (value) => {
      expect(draftPrice(value)).toBeNull()
    }
  )
})

describe('draftErrors', () => {
  it('is empty for a valid draft', () => {
    expect(draftErrors(draft())).toEqual([])
  })

  it('reports the backend limits and the 100,000 Toman minimum', () => {
    expect(
      draftErrors(
        draft({
          title: 'x'.repeat(121),
          price: '99999',
          capacityEnabled: true,
          capacity: '0',
          benefits: [{ key: 'b', title: 'y'.repeat(161), roleId: 1 }],
        })
      )
    ).toEqual(['title', 'priceMinimum', 'capacity', 'benefits'])
    expect(draftErrors(draft({ price: '' }))).toEqual(['price'])
  })

  it('applies the minimum only to a price that changed (BE-TIER-06 checks a sent price)', () => {
    expect(draftErrors(draft({ price: '50000' }), 50000)).toEqual([])
    expect(draftErrors(draft({ price: '60000' }), 50000)).toEqual([
      'priceMinimum',
    ])
  })
})

describe('payloadFromDraft', () => {
  it('trims text and sends integer Toman, chat and no limit', () => {
    expect(payloadFromDraft(draft())).toEqual({
      title: 'Gold',
      description: 'Perks',
      price: 150000,
      chatEnabled: false,
      tireAdvanced: { limitedUser: false },
      benefits: [{ title: 'Chat', roleId: 3 }],
    })
  })

  it('sends a capacity as tireAdvanced', () => {
    expect(
      payloadFromDraft(draft({ capacityEnabled: true, capacity: '۲۵' }))
    ).toMatchObject({
      tireAdvanced: { limitedUser: true, limitNumberUser: 25 },
    })
  })

  it('returns null while the draft has errors', () => {
    expect(payloadFromDraft(draft({ title: ' ' }))).toBeNull()
    expect(payloadFromDraft(draft({ price: '50000' }))).toBeNull()
  })
})

describe('cover', () => {
  it('adds an uploaded cover on create only when there is one', () => {
    expect(coverForCreate(draft())).toEqual({})
    expect(coverForCreate(draft({ coverId }))).toEqual({ coverTireId: coverId })
  })

  it('sends a cover on update only when it changed', () => {
    const saved = draftFromTier(tier)
    expect(coverChange(saved, tier)).toEqual({})
    expect(coverChange({ ...saved, coverId: null }, tier)).toEqual({
      coverTireId: null,
    })
    const next = '1712345679-abcdef012345.png'
    expect(coverChange({ ...saved, coverId: next }, tier)).toEqual({
      coverTireId: next,
    })
  })
})

describe('draftFromTier', () => {
  it('loads every saved field', () => {
    expect(draftFromTier(tier)).toEqual({
      title: 'Supporter',
      description: 'Monthly support',
      price: '150000',
      coverId,
      coverUrl: `https://cdn.example/${coverId}`,
      chatEnabled: true,
      capacityEnabled: true,
      capacity: '25',
      benefits: [{ key: 'existing-2', title: 'Special posts', roleId: 1 }],
    })
  })

  describe('part B: custom benefits, order and price', () => {
    it('sends a custom benefit without roleId, in array order', () => {
      expect(
        payloadFromDraft(
          draft({
            benefits: [
              { key: 'a', title: ' My own ', roleId: null },
              { key: 'b', title: 'Posts', roleId: 1 },
            ],
          })
        )?.benefits
      ).toEqual([{ title: 'My own' }, { title: 'Posts', roleId: 1 }])
    })

    it('moves a benefit up or down and stops at the ends', () => {
      const list = [
        { key: 'a', title: 'A', roleId: 1 },
        { key: 'b', title: 'B', roleId: 2 },
        { key: 'c', title: 'C', roleId: null },
      ]
      expect(moveBenefit(list, 2, -1).map((b) => b.key)).toEqual([
        'a',
        'c',
        'b',
      ])
      expect(moveBenefit(list, 0, 1).map((b) => b.key)).toEqual(['b', 'a', 'c'])
      expect(moveBenefit(list, 0, -1)).toBe(list)
      expect(moveBenefit(list, 2, 1)).toBe(list)
    })

    it('ignores an added benefit whose trimmed title is already listed', () => {
      const list = [{ key: 'a', title: 'Live stream', roleId: 2 }]
      expect(
        addBenefit(list, { key: 'b', title: ' Live stream ', roleId: null })
      ).toBe(list)
      expect(
        addBenefit(list, { key: 'c', title: 'Live Q&A', roleId: 2 }).map(
          (b) => b.key
        )
      ).toEqual(['a', 'c'])
    })

    it('sends a price on update only when it changed', () => {
      expect(priceChange(150000, tier)).toEqual({})
      expect(priceChange(200000, tier)).toEqual({ price: 200000 })
    })
  })
})
