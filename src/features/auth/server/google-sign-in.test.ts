import { HttpResponse, http } from 'msw'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '../../../../test/msw/server'

const jar = vi.hoisted(() => new Map<string, string>())

vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.get(name)
      return value === undefined ? undefined : { name, value }
    },
    set: (name: string, value: string, options?: { maxAge?: number }) => {
      if (options?.maxAge === 0) jar.delete(name)
      else jar.set(name, value)
    },
  }),
}))

const apiOrigin = 'https://api.fellowa.test/api'
vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', apiOrigin)
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fellowa.test/')
vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'public-client-id.example')
const {
  GOOGLE_STATE_COOKIE,
  beginGoogleSignIn,
  completeGoogleSignIn,
  googleRedirectUri,
} = await import('./google-sign-in')
const { sessionCookieName } = await import('./session')
afterAll(() => vi.unstubAllEnvs())

const tokenExpiry = Math.floor(Date.now() / 1000) + 3600
const token = Buffer.from(
  JSON.stringify({ sub: 42, email: 'sara@example.com', exp: tokenExpiry })
).toString('base64url')
const jwt = `eyJhbGciOiJIUzI1NiJ9.${token}.backendSignature`

let exchanges: unknown[] = []
let profileAlias: string | null = null

beforeEach(() => {
  jar.clear()
  exchanges = []
  profileAlias = null
  server.use(
    // `POST /auth/google` (BE-AUTH-07): `{ message, token, user }`.
    http.post(`${apiOrigin}/auth/google`, async ({ request }) => {
      exchanges.push(await request.json())
      return HttpResponse.json(
        {
          data: {
            message: 'Successfully logged in',
            token: jwt,
            user: { id: 42, email: 'sara@example.com', alias: profileAlias },
          },
          errors: null,
        },
        { status: 201 }
      )
    }),
    http.get(`${apiOrigin}/user/42/profile`, () =>
      HttpResponse.json({
        data: {
          id: 42,
          email: 'sara@example.com',
          alias: profileAlias,
          isVerified: true,
        },
        errors: null,
      })
    )
  )
})

async function begin(returnTo?: string) {
  const url = new URL(
    (await beginGoogleSignIn({ locale: 'en', returnTo })) ?? 'about:blank'
  )
  return { url, state: url.searchParams.get('state') ?? '' }
}

describe('beginGoogleSignIn', () => {
  it('asks Google for a code with openid, a fresh state and one redirect URI', async () => {
    const { url, state } = await begin('/creators/5')
    expect(url.origin + url.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    )
    expect(url.searchParams.get('client_id')).toBe('public-client-id.example')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://fellowa.test/auth/google/callback'
    )
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toContain('openid')
    expect(state.length).toBeGreaterThanOrEqual(32)
    expect(jar.get(GOOGLE_STATE_COOKIE)).toBeDefined()
    expect(jar.get(GOOGLE_STATE_COOKIE)).not.toContain(state)
    expect((await begin()).state).not.toBe(state)
  })
})

describe('completeGoogleSignIn', () => {
  it('rejects a state that does not match the cookie, without calling the API', async () => {
    await begin('/creators/5')
    const result = await completeGoogleSignIn({
      code: 'google-code',
      state: 'x'.repeat(43),
      error: null,
    })
    expect(result).toEqual({
      href: {
        pathname: '/auth',
        query: { returnTo: '/creators/5', googleError: 'failed' },
      },
      locale: 'en',
    })
    expect(exchanges).toEqual([])
    expect(jar.has(sessionCookieName)).toBe(false)
    // One use: the cookie is gone, so a replay fails too.
    expect(jar.has(GOOGLE_STATE_COOKIE)).toBe(false)
  })

  it('rejects a callback with no cookie at all', async () => {
    const result = await completeGoogleSignIn({
      code: 'google-code',
      state: 'x'.repeat(43),
      error: null,
    })
    expect(result.href).toEqual({
      pathname: '/auth',
      query: { googleError: 'failed' },
    })
    expect(exchanges).toEqual([])
  })

  it('returns quietly to the entry screen when the user cancelled', async () => {
    const { state } = await begin()
    expect(
      await completeGoogleSignIn({ code: null, state, error: 'access_denied' })
    ).toEqual({ href: { pathname: '/auth', query: {} }, locale: 'en' })
  })

  it('exchanges the code, saves the session and sends a new account to the address step', async () => {
    const { state } = await begin()
    const result = await completeGoogleSignIn({
      code: 'google-code',
      state,
      error: null,
    })
    expect(exchanges).toEqual([
      { code: 'google-code', redirectUri: googleRedirectUri() },
    ])
    expect(jar.get(sessionCookieName)).toBe(jwt)
    // No account step: Google gave the name (presentation AuthContainer).
    expect(result).toEqual({ href: '/auth/url', locale: 'en' })
  })

  it('sends an account that started from a page back to it (FQ-17)', async () => {
    const { state } = await begin('/creators/5')
    const result = await completeGoogleSignIn({
      code: 'google-code',
      state,
      error: null,
    })
    expect(result.href).toBe('/creators/5')
  })

  it('sends an account that has a page to its destination', async () => {
    profileAlias = 'sara'
    const { state } = await begin()
    const result = await completeGoogleSignIn({
      code: 'google-code',
      state,
      error: null,
    })
    expect(result.href).toBe('/studio')
  })

  it.each([
    [400, 'AUTH_GOOGLE_EXCHANGE_FAILED', 'failed'],
    [401, 'AUTH_GOOGLE_EMAIL_NOT_VERIFIED', 'emailNotVerified'],
    [401, 'AUTH_NOT_GOOGLE_ACCOUNT', 'usePassword'],
    [409, 'AUTH_GOOGLE_ALREADY_LINKED', 'alreadyLinked'],
  ])('maps %i %s to the entry screen error %s', async (status, code, kind) => {
    server.use(
      http.post(`${apiOrigin}/auth/google`, () =>
        HttpResponse.json(
          { data: null, errors: [{ message: 'refused', code }] },
          { status }
        )
      )
    )
    const { state } = await begin()
    const result = await completeGoogleSignIn({
      code: 'google-code',
      state,
      error: null,
    })
    expect(result.href).toEqual({
      pathname: '/auth',
      query: { googleError: kind },
    })
    expect(jar.has(sessionCookieName)).toBe(false)
  })
})
