import { describe, expect, it } from 'vitest'

import {
  InvalidTierResponseError,
  parseTierDelete,
  parseTierList,
  parseTierPrice,
  parseTierRoles,
  parseTierWrite,
  tierInputSchema,
} from '@/features/tiers/schemas/tier'

const ok = <T>(data: T) => ({ data, errors: null })

describe('parseTierPrice', () => {
  it.each([
    [50000, 50000],
    ['50000', 50000],
    ['50000.00', 50000],
  ])('accepts %j as integer Toman', (input, expected) => {
    expect(parseTierPrice(input)).toBe(expected)
  })

  it.each(['0', '-1', '12.5', 'abc', '', 0, 1.5])('rejects %j', (input) => {
    expect(() => parseTierPrice(input)).toThrow(InvalidTierResponseError)
  })
})

describe('tier response parsers', () => {
  it('maps a legacy tier row to the UI model and drops unknown fields', () => {
    const [tier] = parseTierList(
      ok([
        {
          id: 1,
          title: 'Gold',
          description: null,
          price: '75000',
          benefits: [{ id: 2, title: 'Chat', roleId: 3 }],
          secret: 'x',
        },
      ])
    )
    expect(tier).toEqual({
      id: 1,
      title: 'Gold',
      description: '',
      priceToman: 75000,
      benefits: [{ id: 2, title: 'Chat', roleId: 3 }],
    })
  })

  it('accepts an empty list', () => {
    expect(parseTierList(ok([]))).toEqual([])
  })

  it('rejects a bare array without the envelope', () => {
    expect(() => parseTierList([])).toThrow(InvalidTierResponseError)
  })

  it('parses roles, write ids and delete acknowledgements', () => {
    expect(parseTierRoles(ok([{ id: 1, title: 'Chat' }]))).toHaveLength(1)
    expect(parseTierWrite(ok({ id: 9 }))).toBe(9)
    expect(() => parseTierDelete(ok({ message: 'deleted' }))).not.toThrow()
    expect(() => parseTierDelete(ok({}))).toThrow(InvalidTierResponseError)
  })
})

describe('tierInputSchema', () => {
  it('rejects fractional, zero and oversized prices', () => {
    for (const price of [0, 1.5, 10_000_000_000]) {
      expect(tierInputSchema.safeParse({ title: 'A', price }).success).toBe(
        false
      )
    }
    expect(tierInputSchema.safeParse({ title: 'A', price: 1 }).success).toBe(
      true
    )
  })
})
