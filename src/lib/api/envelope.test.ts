import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { parseEnvelope } from '@/lib/api/envelope'

class Invalid extends Error {}
const schema = z.object({ id: z.number() })
const invalid = () => new Invalid()

describe('parseEnvelope', () => {
  it('returns data from a success envelope', () => {
    expect(
      parseEnvelope(schema, { data: { id: 1 }, errors: null }, invalid)
    ).toEqual({ id: 1 })
  })

  it.each([
    ['a bare resource', { id: 1 }],
    ['a failure envelope', { data: null, errors: [{ message: 'x' }] }],
    ['a wrong shape', { data: { id: 'a' }, errors: null }],
    ['null', null],
  ])('throws the supplied error for %s', (_name, body) => {
    expect(() => parseEnvelope(schema, body, invalid)).toThrow(Invalid)
  })
})
