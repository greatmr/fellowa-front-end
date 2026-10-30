import { describe, expect, it } from 'vitest'

import { ApiError } from '@/lib/api/errors'

import { hookFeedback } from './hook-feedback'

const failure = (status: number, code?: string) =>
  new ApiError({ message: 'failed', status, code })

describe('hookFeedback', () => {
  it.each([
    [429, 'AUTH_TOO_MANY_ATTEMPTS', 'tooManyAttempts'],
    [429, 'AUTH_RESEND_COOLDOWN', 'resendCooldown'],
    [400, 'AUTH_INVALID_RESET_TOKEN', 'invalidResetToken'],
    [400, 'AUTH_INVALID_CODE', 'invalidCode'],
  ])('maps %i %s to its own state', (status, code, expected) => {
    expect(hookFeedback(failure(status, code), true)).toEqual({
      status: 'error',
      error: expected,
    })
  })

  it('keeps the generic state for a throttled route without a known code', () => {
    expect(hookFeedback(failure(429))).toEqual({
      status: 'error',
      error: 'rateLimited',
    })
  })

  it('does not call a public route failure an expired session', () => {
    expect(hookFeedback(failure(404))).toEqual({
      status: 'error',
      error: 'unexpected',
    })
  })
})
