import { describe, expect, it } from 'vitest'

import { toLatinDigits } from '@/lib/digits'

import {
  InvalidSettingsResponseError,
  createPageNameSchema,
  createPasswordSchema,
  createPersonalSchema,
  normalizeMobile,
  normalizePageName,
  pageNamePayloadSchema,
  parsePageNameState,
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

describe('page name (FE-AUTH-03, BE-USER-07)', () => {
  const form = createPageNameSchema({ length: 'length' })
  const envelope = (data: unknown) => ({ data, errors: null })
  // `GET /user/about` (`AboutInfo`), as the backend sends it.
  const about = {
    id: 3,
    accountId: 42,
    pageName: 'Dana Studio',
    bio: null,
    videoUrl: null,
    facebookLink: null,
    instagramLink: null,
    twitterLink: null,
    youtubeLink: null,
    createdAt: '2026-11-09T10:00:00.000Z',
    updatedAt: '2026-11-09T10:00:00.000Z',
  }

  it.each([
    [' Dana ', 'Dana'],
    ['', null],
    ['   ', null],
    [null, null],
  ])('stores %j as %j, as the backend does', (input, stored) => {
    expect(normalizePageName(input)).toBe(stored)
    expect(pageNamePayloadSchema.parse(input)).toBe(stored)
  })

  it('takes 2 to 80 characters once trimmed, or empty to clear', () => {
    for (const ok of ['', '  ', 'دا', ' ab ', 'x'.repeat(80)]) {
      expect(form.safeParse({ pageName: ok }).success).toBe(true)
    }
    for (const bad of ['a', ' a ', 'x'.repeat(81)]) {
      const result = form.safeParse({ pageName: bad })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('length')
    }
    expect(pageNamePayloadSchema.safeParse('a').success).toBe(false)
  })

  it('counts characters, not UTF-16 units, as the backend does', () => {
    // 80 emoji are 160 UTF-16 units and still 80 characters.
    expect(form.safeParse({ pageName: '🎨'.repeat(80) }).success).toBe(true)
    expect(form.safeParse({ pageName: '🎨'.repeat(81) }).success).toBe(false)
  })

  it.each([
    ['a string', 'Dana Studio', 'Dana Studio'],
    ['null', null, null],
    ['missing', undefined, null],
  ])('reads a page name that is %s', (_name, pageName, expected) => {
    expect(parsePageNameState(envelope({ ...about, pageName }))).toEqual({
      hasPage: true,
      pageName: expected,
    })
  })

  it('reads an account with no page (`id: null`) as nothing to name', () => {
    expect(
      parsePageNameState(envelope({ ...about, id: null, pageName: null }))
    ).toEqual({ hasPage: false, pageName: null })
  })

  it('refuses a malformed response', () => {
    expect(() =>
      parsePageNameState(envelope({ ...about, pageName: 7 }))
    ).toThrow(InvalidSettingsResponseError)
  })
})
