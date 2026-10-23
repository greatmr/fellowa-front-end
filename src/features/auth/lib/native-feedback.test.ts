import { describe, expect, it } from 'vitest'

import type { AuthActionState } from '@/features/auth/types'

import { authFeedbackCode, parseAuthFeedback } from './native-feedback'

describe('native form feedback message keys', () => {
  const states: AuthActionState[] = [
    { status: 'sent' },
    { status: 'error', error: 'invalidCredentials' },
    { status: 'error', error: 'emailTaken' },
    { status: 'error', error: 'rateLimited' },
    { status: 'error', error: 'network' },
    { status: 'error', error: 'unavailable' },
    { status: 'error', error: 'invalidResponse' },
    { status: 'error', error: 'expiredSession' },
    { status: 'error', error: 'invalidCode' },
    { status: 'error', error: 'alreadyVerified' },
    { status: 'error', error: 'invalidRequest' },
    { status: 'error', error: 'unexpected' },
    { status: 'error', fieldErrors: { email: 'email' } },
    { status: 'error', fieldErrors: { password: 'passwordRequired' } },
    { status: 'error', fieldErrors: { password: 'passwordLength' } },
    {
      status: 'error',
      fieldErrors: { email: 'email', password: 'passwordRequired' },
    },
    {
      status: 'error',
      fieldErrors: { email: 'email', password: 'passwordLength' },
    },
    { status: 'error', fieldErrors: { code: 'code' } },
  ]

  it.each(states)('round-trips only public error state %j', (state) => {
    expect(parseAuthFeedback(authFeedbackCode(state))).toEqual(state)
  })

  it.each([
    undefined,
    null,
    ['invalidCredentials'],
    { error: 'emailTaken' },
    '__proto__',
    '<script>alert(1)</script>',
    'verified',
    'private@example.com',
    'eyJhbGciOiJIUzI1NiJ9.payload.signature',
  ])('ignores unknown or nonscalar query feedback %j', (value) =>
    expect(parseAuthFeedback(value)).toEqual({ status: 'idle' })
  )

  it('does not create a message for idle state', () => {
    expect(authFeedbackCode({ status: 'idle' })).toBeNull()
  })

  it('uses a fixed fallback for an error without recognized fields', () => {
    expect(authFeedbackCode({ status: 'error', fieldErrors: {} })).toBe(
      'unexpected'
    )
  })
})
