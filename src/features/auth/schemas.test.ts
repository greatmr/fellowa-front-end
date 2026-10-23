import { describe, expect, it } from 'vitest'

import { createCredentialsSchema, createVerificationSchema } from './schemas'

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
})
