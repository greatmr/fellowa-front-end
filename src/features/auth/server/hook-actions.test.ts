import { HttpResponse, http } from 'msw'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '../../../../test/msw/server'

const request = vi.hoisted(() => ({
  origin: 'https://fellowa.test',
  cookies: new Map<string, string>(),
  setCookie: vi.fn(),
}))

vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ origin: request.origin }),
  cookies: async () => ({
    get: (name: string) => {
      const value = request.cookies.get(name)
      return value === undefined ? undefined : { name, value }
    },
    set: request.setCookie,
  }),
}))

const apiOrigin = 'https://api.fellowa.test/api'
vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', apiOrigin)
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fellowa.test')
const {
  changePasswordForHook,
  confirmPasswordResetForHook,
  exchangeGoogleCodeForHook,
  loginForHook,
  logoutForHook,
  ownProfileForHook,
  requestPasswordResetForHook,
  resendEmailForHook,
  setAliasForHook,
  verifyEmailForHook,
  verifyAuthTokenForHook,
} = await import('./hook-actions')
const { readSession, sessionCookieName } = await import('./session')
afterAll(() => vi.unstubAllEnvs())

// Fixed for the file: a token built from the clock on each call would differ
// across a second boundary, and the handlers compare tokens exactly.
const tokenExpiry = Math.floor(Date.now() / 1000) + 3600

function token(userId = 42, expiry = tokenExpiry) {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: expiry })
  ).toString('base64url')
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.backendSignature`
}

let verified = false
let upstreamCalls = 0

beforeEach(() => {
  vi.clearAllMocks()
  request.origin = 'https://fellowa.test'
  request.cookies.clear()
  verified = false
  upstreamCalls = 0
  server.use(
    http.post(`${apiOrigin}/auth/login`, async ({ request: upstream }) => {
      upstreamCalls++
      expect(await upstream.json()).toEqual({
        email: 'creator@example.com',
        password: 'password',
      })
      return HttpResponse.json(
        {
          data: {
            message: 'Successfully logged in',
            isVerified: false,
            isPublish: false,
            token: token(),
            user: { id: 42, email: 'creator@example.com', alias: null },
          },
          errors: null,
        },
        { status: 201 }
      )
    }),
    http.get(`${apiOrigin}/user/42/profile`, ({ request: upstream }) => {
      upstreamCalls++
      expect(upstream.headers.get('authorization')).toBe(`Bearer ${token()}`)
      return HttpResponse.json({
        data: {
          id: 42,
          email: 'creator@example.com',
          alias: null,
          isVerified: verified,
        },
        errors: null,
      })
    }),
    http.put(`${apiOrigin}/auth/verify-code`, async ({ request: upstream }) => {
      upstreamCalls++
      expect(upstream.headers.get('authorization')).toBe(`Bearer ${token()}`)
      expect(await upstream.json()).toEqual({ code: '012345' })
      verified = true
      return HttpResponse.json({
        data: { message: 'Account verified successfully' },
        errors: null,
      })
    }),
    http.put(`${apiOrigin}/auth/alias`, async ({ request: upstream }) => {
      upstreamCalls++
      expect(upstream.headers.get('authorization')).toBe(`Bearer ${token()}`)
      expect(await upstream.json()).toEqual({ alias: 'creator_name' })
      return HttpResponse.json({
        data: { message: 'Alias set successfully' },
        errors: null,
      })
    })
  )
})

describe('auth hook server boundary', () => {
  it('establishes a login session without returning the JWT to the hook', async () => {
    const result = await loginForHook({
      email: 'creator@example.com',
      password: 'password',
    })
    expect(result).toEqual({
      ok: true,
      data: {
        id: 42,
        email: 'creator@example.com',
        alias: null,
        isVerified: false,
      },
    })
    expect(JSON.stringify(result)).not.toContain(token())
    expect(request.setCookie).toHaveBeenCalledWith(
      sessionCookieName,
      token(),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
    )
  })

  it('uses the cookie for a profile query and rejects a mismatched cache identity', async () => {
    request.cookies.set(sessionCookieName, token())
    expect(await ownProfileForHook(42)).toEqual({
      ok: true,
      data: {
        id: 42,
        email: 'creator@example.com',
        alias: null,
        isVerified: false,
      },
    })
    expect(await ownProfileForHook(9)).toEqual({
      ok: false,
      status: 403,
      code: undefined,
      isNetworkError: false,
    })
    expect(upstreamCalls).toBe(2)
  })

  it('validates Origin and DTOs before auth mutations', async () => {
    request.origin = 'https://attacker.example'
    expect(
      await loginForHook({ email: 'creator@example.com', password: 'password' })
    ).toMatchObject({ ok: false, status: 403 })
    expect(
      await requestPasswordResetForHook({ email: 'creator@example.com' })
    ).toMatchObject({ ok: false, status: 403 })
    expect(upstreamCalls).toBe(0)
    request.origin = 'https://fellowa.test'
    expect(
      await loginForHook({ email: 'bad', password: 'password' })
    ).toMatchObject({ ok: false, status: 400 })
    expect(upstreamCalls).toBe(0)
  })

  it('verifies against a fresh profile and keeps guarded tokens on the server', async () => {
    request.cookies.set(sessionCookieName, token())
    expect(await verifyEmailForHook({ code: '012345' })).toEqual({
      ok: true,
      data: null,
    })
    expect(await setAliasForHook({ alias: 'creator_name' })).toEqual({
      ok: true,
      data: null,
    })
    expect(upstreamCalls).toBe(5)
  })

  it.each(['ab', 'a'.repeat(31), 'creator-name', 'نام_کاربری', '۱۲۳۴'])(
    'refuses the alias %s before it reaches the API',
    async (alias) => {
      request.cookies.set(sessionCookieName, token())
      expect(await setAliasForHook({ alias })).toEqual({
        ok: false,
        status: 400,
        code: 'INVALID_REQUEST',
      })
      expect(upstreamCalls).toBe(0)
    }
  )

  it('rejects missing sessions before protected mutations and clears the cookie on logout', async () => {
    expect(
      await changePasswordForHook({
        currentPassword: 'old-password',
        newPassword: 'new-password',
      })
    ).toMatchObject({ ok: false, status: 401 })
    expect(upstreamCalls).toBe(0)
    expect(await logoutForHook()).toEqual({ ok: true, data: null })
    expect(request.setCookie).toHaveBeenCalledWith(
      sessionCookieName,
      '',
      expect.objectContaining({ maxAge: 0, httpOnly: true })
    )
  })

  it.each(['not-a-jwt', token(42, 1), token(0)])(
    'rejects malformed or expired session cookie %s before a profile call',
    async (value) => {
      request.cookies.set(sessionCookieName, value)
      expect(await readSession()).toBeNull()
      expect(upstreamCalls).toBe(0)
    }
  )

  it('rejects forged profile identity while preserving transient backend failures', async () => {
    request.cookies.set(sessionCookieName, token())
    server.use(
      http.get(`${apiOrigin}/user/42/profile`, () =>
        HttpResponse.json({
          data: {
            id: 9,
            email: 'other@example.com',
            alias: null,
            isVerified: true,
          },
          errors: null,
        })
      )
    )
    await expect(readSession()).rejects.toMatchObject({
      name: 'InvalidAuthResponseError',
    })
    expect(request.setCookie).not.toHaveBeenCalled()

    server.use(
      http.get(`${apiOrigin}/user/42/profile`, () =>
        HttpResponse.json(
          {
            data: null,
            errors: [{ message: 'Unavailable', code: 'UNAVAILABLE' }],
          },
          { status: 503 }
        )
      )
    )
    await expect(readSession()).rejects.toMatchObject({ status: 503 })
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it('refuses verification success until a fresh profile confirms it', async () => {
    request.cookies.set(sessionCookieName, token())
    server.use(
      http.put(`${apiOrigin}/auth/verify-code`, () =>
        HttpResponse.json({
          data: { message: 'Account verified' },
          errors: null,
        })
      )
    )
    expect(await verifyEmailForHook({ code: '012345' })).toEqual({
      ok: false,
      code: 'INVALID_AUTH_RESPONSE',
    })
  })

  it('accepts already-verified only after a fresh profile confirms it', async () => {
    request.cookies.set(sessionCookieName, token())
    server.use(
      http.put(`${apiOrigin}/auth/verify-code`, () => {
        verified = true
        return HttpResponse.json(
          {
            data: null,
            errors: [
              { message: 'Already verified', code: 'AUTH_ALREADY_VERIFIED' },
            ],
          },
          { status: 400 }
        )
      })
    )
    expect(await verifyEmailForHook({ code: '012345' })).toEqual({
      ok: true,
      data: null,
    })
  })

  it('keeps recovery, password change, Google, and token validation behind safe action results', async () => {
    server.use(
      http.post(
        `${apiOrigin}/auth/forgot-password`,
        async ({ request: upstream }) => {
          expect(await upstream.json()).toEqual({
            email: 'creator@example.com',
          })
          return HttpResponse.json({
            data: { message: 'Check your email' },
            errors: null,
          })
        }
      ),
      http.post(
        `${apiOrigin}/auth/reset-password/confirm`,
        async ({ request: upstream }) => {
          expect(await upstream.json()).toEqual({
            token: 'reset-token-from-email',
            newPassword: 'new-password',
          })
          return HttpResponse.json({
            data: { message: 'Password reset' },
            errors: null,
          })
        }
      ),
      http.put(
        `${apiOrigin}/auth/reset-password`,
        async ({ request: upstream }) => {
          expect(upstream.headers.get('authorization')).toBe(
            `Bearer ${token()}`
          )
          expect(await upstream.json()).toEqual({
            currentPassword: 'old-password',
            newPassword: 'new-password',
          })
          return HttpResponse.json({
            data: { message: 'Password changed' },
            errors: null,
          })
        }
      ),
      http.post(`${apiOrigin}/auth/google`, async ({ request: upstream }) => {
        expect(await upstream.json()).toEqual({
          code: 'google-code',
          redirectUri: 'https://fellowa.test/callback',
        })
        return HttpResponse.json({
          data: {
            message: 'Successfully logged in',
            token: token(),
            user: { id: 42, email: 'creator@example.com', alias: null },
          },
          errors: null,
        })
      }),
      http.post(
        `${apiOrigin}/auth/verify-token`,
        async ({ request: upstream }) => {
          expect(await upstream.json()).toEqual({ token: token() })
          return HttpResponse.json({
            data: {
              valid: true,
              payload: {
                sub: 42,
                email: 'creator@example.com',
                exp: tokenExpiry,
              },
            },
            errors: null,
          })
        }
      )
    )
    expect(
      await requestPasswordResetForHook({ email: 'creator@example.com' })
    ).toEqual({ ok: true, data: null })
    expect(
      await confirmPasswordResetForHook({
        token: 'reset-token-from-email',
        newPassword: 'new-password',
      })
    ).toEqual({ ok: true, data: null })
    request.cookies.set(sessionCookieName, token())
    expect(
      await changePasswordForHook({
        currentPassword: 'old-password',
        newPassword: 'new-password',
      })
    ).toEqual({ ok: true, data: null })
    expect(await verifyAuthTokenForHook()).toEqual({ ok: true, data: true })
    const google = await exchangeGoogleCodeForHook({
      code: 'google-code',
      redirectUri: 'https://fellowa.test/callback',
    })
    expect(google).toEqual({
      ok: true,
      data: {
        id: 42,
        email: 'creator@example.com',
        alias: null,
        isVerified: false,
      },
    })
    expect(JSON.stringify(google)).not.toContain(token())
  })
})

describe('password recovery against the backend contract', () => {
  // `AuthService.forgotPassword` answers this for every email; POST is a 201.
  const forgotResponse = {
    data: {
      message: 'If that email exists, a password reset token has been sent',
    },
    errors: null,
  }
  const resetToken = 'q7Xv2mZk9LwR4tYb1NcH8sJd5GfP3aUe6oIi0TrKyQw'
  const confirm = { token: resetToken, newPassword: 'brand-new-pass' }

  it('gives the same result for a known and an unknown email', async () => {
    const asked: unknown[] = []
    server.use(
      http.post(
        `${apiOrigin}/auth/forgot-password`,
        async ({ request: upstream }) => {
          upstreamCalls++
          asked.push(await upstream.json())
          return HttpResponse.json(forgotResponse, { status: 201 })
        }
      )
    )
    const known = await requestPasswordResetForHook({
      email: 'creator@example.com',
    })
    const unknown = await requestPasswordResetForHook({
      email: 'nobody@example.com',
    })
    expect(known).toEqual({ ok: true, data: null })
    expect(unknown).toEqual(known)
    expect(asked).toEqual([
      { email: 'creator@example.com' },
      { email: 'nobody@example.com' },
    ])
  })

  it('sends the token and password and establishes no session', async () => {
    server.use(
      http.post(
        `${apiOrigin}/auth/reset-password/confirm`,
        async ({ request: upstream }) => {
          upstreamCalls++
          expect(await upstream.json()).toEqual(confirm)
          expect(upstream.headers.get('authorization')).toBeNull()
          return HttpResponse.json(
            { data: { message: 'Password has been reset' }, errors: null },
            { status: 201 }
          )
        }
      )
    )
    const result = await confirmPasswordResetForHook(confirm)
    expect(result).toEqual({ ok: true, data: null })
    expect(JSON.stringify(result)).not.toContain(resetToken)
    expect(upstreamCalls).toBe(1)
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it('passes on an invalid or expired token without the token', async () => {
    server.use(
      http.post(`${apiOrigin}/auth/reset-password/confirm`, () =>
        HttpResponse.json(
          {
            data: null,
            errors: [
              {
                message: 'Reset token is invalid or has expired',
                code: 'AUTH_INVALID_RESET_TOKEN',
              },
            ],
          },
          { status: 400 }
        )
      )
    )
    const result = await confirmPasswordResetForHook(confirm)
    expect(result).toEqual({
      ok: false,
      status: 400,
      code: 'AUTH_INVALID_RESET_TOKEN',
      isNetworkError: false,
    })
    expect(JSON.stringify(result)).not.toContain(resetToken)
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it.each([
    ['a too-short password', { token: resetToken, newPassword: 'short' }],
    ['a too-short token', { token: 'short', newPassword: 'brand-new-pass' }],
  ])('refuses %s before any upstream call', async (_name, input) => {
    expect(await confirmPasswordResetForHook(input)).toEqual({
      ok: false,
      status: 400,
      code: 'INVALID_REQUEST',
    })
    expect(upstreamCalls).toBe(0)
  })

  it('checks Origin before a reset', async () => {
    request.origin = 'https://attacker.example'
    expect(await confirmPasswordResetForHook(confirm)).toEqual({
      ok: false,
      status: 403,
      code: 'INVALID_REQUEST',
    })
    expect(upstreamCalls).toBe(0)
  })
})

describe('verification states against the backend contract', () => {
  const failure = (status: number, message: string, code: string) =>
    HttpResponse.json({ data: null, errors: [{ message, code }] }, { status })

  beforeEach(() => {
    request.cookies.set(sessionCookieName, token())
  })

  it.each([
    [400, 'Invalid or expired code', 'AUTH_INVALID_CODE'],
    [
      429,
      'Too many attempts. Try again in 900 seconds',
      'AUTH_TOO_MANY_ATTEMPTS',
    ],
  ])('passes on a %i %s from verify-code', async (status, message, code) => {
    server.use(
      http.put(`${apiOrigin}/auth/verify-code`, () =>
        failure(status, message, code)
      )
    )
    expect(await verifyEmailForHook({ code: '012345' })).toEqual({
      ok: false,
      status,
      code,
      isNetworkError: false,
    })
  })

  it('passes on the resend cool-down', async () => {
    server.use(
      http.put(`${apiOrigin}/auth/resend-code`, () =>
        failure(
          429,
          'A code was sent recently. Try again in 42 seconds',
          'AUTH_RESEND_COOLDOWN'
        )
      )
    )
    expect(await resendEmailForHook()).toEqual({
      ok: false,
      status: 429,
      code: 'AUTH_RESEND_COOLDOWN',
      isNetworkError: false,
    })
  })

  it('passes on already-verified from resend-code', async () => {
    server.use(
      http.put(`${apiOrigin}/auth/resend-code`, () =>
        failure(400, 'Account already verified', 'AUTH_ALREADY_VERIFIED')
      )
    )
    expect(await resendEmailForHook()).toEqual({
      ok: false,
      status: 400,
      code: 'AUTH_ALREADY_VERIFIED',
      isNetworkError: false,
    })
  })

  it('does not ask for a code for a session already verified', async () => {
    verified = true
    expect(await resendEmailForHook()).toMatchObject({
      ok: false,
      status: 400,
      code: 'AUTH_ALREADY_VERIFIED',
    })
    // The fresh profile only: no resend-code handler exists in this test.
    expect(upstreamCalls).toBe(1)
  })

  it('resends a code', async () => {
    server.use(
      http.put(`${apiOrigin}/auth/resend-code`, () =>
        HttpResponse.json({
          data: { message: 'Verification code sent' },
          errors: null,
        })
      )
    )
    expect(await resendEmailForHook()).toEqual({ ok: true, data: null })
  })
})
