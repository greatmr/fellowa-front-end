import { describe, expect, it } from 'vitest'

import { toLatinDigits } from '@/lib/digits'

import {
  createPasswordSchema,
  createPersonalSchema,
  normalizeMobile,
  parsePersonal,
} from './settings'

const personal = createPersonalSchema({
  firstNameLength: 'first',
  lastNameLength: 'last',
  phone: 'phone',
})
const password = createPasswordSchema({
  currentRequired: 'current',
  newLength: 'length',
  tooLong: 'too long',
  mismatch: 'mismatch',
})

describe('settings schemas (FE-SET-01)', () => {
  it('reads Persian and Arabic-Indic digits as Latin', () => {
    expect(toLatinDigits('۰۹۱۲٣٤٥')).toBe('0912345')
    expect(normalizeMobile('۰۹۱۲ ۱۲۳-۴۵۶۷')).toBe('09121234567')
  })

  it.each([
    ['', true],
    ['09121234567', true],
    ['۰۹۱۲۱۲۳۴۵۶۷', true],
    ['0912 123 4567', true],
    ['9121234567', false],
    ['091212345678', false],
    ['+989121234567', false],
  ])('mobile %j is valid: %p', (phoneNumber, ok) => {
    const result = personal.safeParse({
      firstName: '',
      lastName: '',
      phoneNumber,
    })
    expect(result.success).toBe(ok)
    if (ok && result.success && phoneNumber) {
      expect(result.data.phoneNumber).toBe('09121234567')
    }
  })

  it('enforces the backend name limits', () => {
    expect(
      personal.safeParse({
        firstName: 'x'.repeat(61),
        lastName: '',
        phoneNumber: '',
      }).success
    ).toBe(false)
    expect(
      personal.safeParse({
        firstName: '',
        lastName: 'x'.repeat(101),
        phoneNumber: '',
      }).success
    ).toBe(false)
  })

  it('needs the current password, 8+ characters and a matching repeat', () => {
    const ok = {
      currentPassword: 'old',
      newPassword: 'long-enough',
      confirmPassword: 'long-enough',
    }
    expect(password.safeParse(ok).success).toBe(true)
    const errors = (value: object) =>
      password
        .safeParse({ ...ok, ...value })
        .error?.issues.map((i) => i.message)
    expect(errors({ currentPassword: '' })).toEqual(['current'])
    expect(errors({ newPassword: 'short', confirmPassword: 'short' })).toEqual([
      'length',
    ])
    expect(errors({ confirmPassword: 'different' })).toEqual(['mismatch'])
    const long = 'x'.repeat(201)
    expect(errors({ newPassword: long, confirmPassword: long })).toEqual([
      'too long',
    ])
  })

  it('maps the personal record and turns missing fields into empty strings', () => {
    expect(
      parsePersonal({
        data: {
          id: 3,
          accountId: 7,
          firstName: 'Sara',
          lastName: null,
          gender: true,
        },
        errors: null,
      })
    ).toEqual({ firstName: 'Sara', lastName: '', phoneNumber: '' })
  })
})
