import { describe, expect, it } from 'vitest'

import {
  addressFromName,
  addressStatus,
  canSaveAddress,
  cleanAddressInput,
} from './page-address'

describe('cleanAddressInput (backend alias rules)', () => {
  it.each([
    ['Studio', 'studio', false],
    ['my.name', 'myname', true],
    ['sara-art', 'saraart', true],
    ['سارا', '', true],
    ['a b', 'ab', false],
    // The Kelvin sign lowercases to an ASCII k; it is dropped first.
    ['Kelvin', 'elvin', true],
    ['x'.repeat(40), 'x'.repeat(30), false],
  ])('%j → %j (dropped: %s)', (raw, value, dropped) => {
    expect(cleanAddressInput(raw)).toEqual({ value, dropped })
  })
})

describe('addressFromName', () => {
  it.each([
    ['Sara Studio', 'sarastudio'],
    ['سارا محمدی', ''],
    ['Al', ''],
  ])('%j → %j', (name, expected) => {
    expect(addressFromName(name)).toBe(expected)
  })
})

describe('addressStatus', () => {
  const base = {
    value: 'sara',
    settled: true,
    checking: false,
    answer: undefined,
    takenOnSave: null,
  }
  const answer = (
    reason: 'too_short' | 'invalid' | 'reserved' | 'taken' | null,
    alias = 'sara'
  ) => ({ alias, available: reason === null, reason, suggestions: [] })

  it.each([
    [{ value: '' }, 'idle'],
    [{ value: 'ab' }, 'tooShort'],
    [{ settled: false }, 'checking'],
    [{ checking: true }, 'checking'],
    [{ answer: answer(null) }, 'available'],
    [{ answer: answer('taken') }, 'taken'],
    [{ answer: answer('reserved') }, 'reserved'],
    [{ answer: answer('invalid') }, 'invalid'],
    // An answer about another address, or none (429, network): unknown.
    [{ answer: answer(null, 'other') }, 'unchecked'],
    [{}, 'unchecked'],
    // The save's 409 wins over an earlier "available".
    [{ answer: answer(null), takenOnSave: 'sara' }, 'taken'],
  ] as const)('%o → %s', (input, expected) => {
    expect(addressStatus({ ...base, ...input })).toBe(expected)
  })

  it('saves only an available or unchecked address', () => {
    expect(canSaveAddress('available')).toBe(true)
    expect(canSaveAddress('unchecked')).toBe(true)
    for (const status of [
      'idle',
      'tooShort',
      'invalid',
      'checking',
      'taken',
      'reserved',
    ] as const) {
      expect(canSaveAddress(status)).toBe(false)
    }
  })
})
