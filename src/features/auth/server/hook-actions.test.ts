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
      expect(await upstream.json()).toEqual({ alias: 'creator-name' })
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
    expect(await setAliasForHook({ alias: 'creator-name' })).toEqual({
      ok: true,
      data: null,
    })
    expect(upstreamCalls).toBe(5)
  })

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
