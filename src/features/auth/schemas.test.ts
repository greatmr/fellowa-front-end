import { describe, expect, it } from 'vitest'

import {
  createAliasSchema,
  createCredentialsSchema,
  createForgotPasswordSchema,
  createResetPasswordSchema,
  createVerificationSchema,
  normalizeAlias,
} from './schemas'

describe('alias schema (BE-USER-04)', () => {
  const parse = (alias: string) => createAliasSchema().safeParse({ alias })
  const firstError = (alias: string) => parse(alias).error?.issues[0]?.message

  it.each(['abc', 'Studio', 'a_b_9', 'A'.repeat(30)])('accepts %s', (alias) => {
    expect(parse(alias).success).toBe(true)
  })

  it('checks the trimmed value and keeps its case', () => {
    expect(parse('  Studio ').data).toEqual({ alias: 'Studio' })
    expect(firstError('  a ')).toBe('aliasTooShort')
  })

  it('names the rule that failed', () => {
    expect(firstError('')).toBe('aliasTooShort')
    expect(firstError('ab')).toBe('aliasTooShort')
    expect(firstError('a'.repeat(31))).toBe('aliasTooLong')
    expect(firstError('bad-name')).toBe('aliasChars')
    expect(firstError('bad name')).toBe('aliasChars')
  })

  it.each([
    ['Persian letters', 'نام_من'],
    ['Persian digits', '۱۲۳۴'],
    ['Arabic digits', '١٢٣٤'],
    ['a mix with Persian digits', 'studio۱'],
    ['a character that lowercases to ASCII', 'stu\u212Adio'],
  ])('refuses %s', (_name, alias) => {
    expect(firstError(alias)).toBe('aliasChars')
  })

  it('shows what the backend stores', () => {
    expect(normalizeAlias(' Studio_9 ')).toBe('studio_9')
  })
})

describe('authentication schemas', () => {
  it('trims only email and preserves its case and password whitespace', () => {
    expect(
      createCredentialsSchema('register').parse({
        email: '  Creator@Example.com ',
        password: ' password ',
      })
    ).toEqual({ email: 'Creator@Example.com', password: ' password ' })
  })

  it('accepts an existing short password for login but not registration', () => {
    const credentials = { email: 'creator@example.com', password: 'short' }
    expect(
      createCredentialsSchema('login').safeParse(credentials).success
    ).toBe(true)
    expect(
      createCredentialsSchema('register').safeParse(credentials).success
    ).toBe(false)
  })

  it('requires an email and nonempty login password', () => {
    const result = createCredentialsSchema('login').safeParse({
      email: '',
      password: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual([
        'email',
        'passwordRequired',
      ])
    }
  })

  it('supports translated validation messages', () => {
    const result = createCredentialsSchema('register', {
      email: 'Invalid email address',
      passwordRequired: 'Enter your password',
      passwordLength: 'Use at least eight characters',
      code: 'Use six digits',
    }).safeParse({ email: 'invalid', password: 'short' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual([
        'Invalid email address',
        'Use at least eight characters',
      ])
    }
  })

  it.each(['12345', '1234567', 'abcdef', ' 123456', '۱۲۳۴۵۶'])(
    'rejects invalid code %s',
    (code) => {
      expect(createVerificationSchema().safeParse({ code }).success).toBe(false)
    }
  )

  it('accepts a six-digit code', () => {
    expect(createVerificationSchema().parse({ code: '123456' })).toEqual({
      code: '123456',
    })
  })

  it('trims the email a recovery is requested for', () => {
    expect(
      createForgotPasswordSchema().parse({ email: ' creator@example.com ' })
    ).toEqual({ email: 'creator@example.com' })
    expect(
      createForgotPasswordSchema().safeParse({ email: 'nope' }).success
    ).toBe(false)
  })

  it('trims a pasted reset token but never the new password', () => {
    expect(
      createResetPasswordSchema().parse({
        token: `  ${'a'.repeat(43)}\n`,
        newPassword: ' password ',
      })
    ).toEqual({ token: 'a'.repeat(43), newPassword: ' password ' })
  })

  it.each([
    ['a token below the DTO minimum', 'a'.repeat(15), 'password', 'resetToken'],
    [
      'a token above the DTO maximum',
      'a'.repeat(129),
      'password',
      'resetToken',
    ],
    ['a short password', 'a'.repeat(16), 'short', 'passwordLength'],
  ])('rejects %s', (_name, token, newPassword, message) => {
    const result = createResetPasswordSchema().safeParse({ token, newPassword })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual([
        message,
      ])
    }
  })

  it('accepts the DTO limits for a reset token', () => {
    for (const length of [16, 128]) {
      expect(
        createResetPasswordSchema().safeParse({
          token: 'a'.repeat(length),
          newPassword: 'password',
        }).success
      ).toBe(true)
    }
  })
})
