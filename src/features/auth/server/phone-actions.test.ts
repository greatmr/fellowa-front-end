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
  aliasAvailabilityForHook,
  completeAccountForHook,
  phoneLoginForHook,
  phoneLookupForHook,
  requestPhoneCodeForHook,
  verifyPhoneCodeForHook,
} = await import('./hook-actions')
const { sessionCookieName } = await import('./session')
afterAll(() => vi.unstubAllEnvs())

const tokenExpiry = Math.floor(Date.now() / 1000) + 3600

/** BE-AUTH-08: the access JWT carries `{ sub, email }`, `email` null by phone. */
function token(userId = 77) {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, email: null, exp: tokenExpiry })
  ).toString('base64url')
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.backendSignature`
}

const failure = (status: number, message: string, code: string) =>
  HttpResponse.json({ data: null, errors: [{ message, code }] }, { status })

/** `phone/verify` and `phone/login` success, as `PhoneAuthService.signIn`. */
function signedIn(overrides: Record<string, unknown> = {}) {
  return HttpResponse.json(
    {
      data: {
        message: 'Successfully logged in',
        isNewUser: true,
        needsProfile: true,
        hasPassword: false,
        isVerified: true,
        isPublish: false,
        token: token(),
        user: { id: 77, email: null, phone: '09121234567', alias: null },
        ...overrides,
      },
      errors: null,
    },
    {
      status: 201,
      headers: {
        'Set-Cookie':
          'refresh_token=opaque; Path=/api/auth; HttpOnly; SameSite=Strict',
      },
    }
  )
}

let upstream: { path: string; body: unknown; auth: string | null }[] = []

beforeEach(() => {
  vi.clearAllMocks()
  request.origin = 'https://fellowa.test'
  request.cookies.clear()
  upstream = []
  const record = async (path: string, req: Request) => {
    upstream.push({
      path,
      body: await req.json(),
      auth: req.headers.get('authorization'),
    })
  }
  server.use(
    http.post(
      `${apiOrigin}/auth/phone/request-code`,
      async ({ request: req }) => {
        await record('request-code', req)
        return HttpResponse.json(
          {
            data: {
              phone: '09121234567',
              hasAccount: false,
              hasPassword: false,
              resendAfterSeconds: 120,
              expiresInSeconds: 120,
            },
            errors: null,
          },
          { status: 201 }
        )
      }
    ),
    http.post(`${apiOrigin}/auth/phone/verify`, async ({ request: req }) => {
      await record('verify', req)
      return signedIn()
    }),
    http.post(`${apiOrigin}/auth/phone/login`, async ({ request: req }) => {
      await record('login', req)
      return signedIn({ isNewUser: false, needsProfile: false })
    }),
    http.put(`${apiOrigin}/auth/account`, async ({ request: req }) => {
      await record('account', req)
      return HttpResponse.json({
        data: {
          message: 'Account updated',
          displayName: 'Sara',
          hasPassword: false,
        },
        errors: null,
      })
    }),
    // The owner profile of a phone-only account: `email` null (user api.md).
    http.get(`${apiOrigin}/user/77/profile`, () =>
      HttpResponse.json({
        data: {
          id: 77,
          email: null,
          alias: null,
          displayName: null,
          isVerified: true,
          hasPassword: false,
          isPublish: false,
          categoryId: null,
          personal: null,
          about: null,
          images: { profile: null, header: null },
        },
        errors: null,
      })
    )
  )
})

describe('request-code', () => {
  it('sends the normalised number and returns what the API said', async () => {
    expect(
      await requestPhoneCodeForHook({ phone: '+98 ۹۱۲ ۱۲۳ ۴۵۶۷' })
    ).toEqual({
      ok: true,
      data: {
        phone: '09121234567',
        hasAccount: false,
        hasPassword: false,
        resendAfterSeconds: 120,
        expiresInSeconds: 120,
      },
    })
    expect(upstream).toEqual([
      { path: 'request-code', body: { phone: '09121234567' }, auth: null },
    ])
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it('refuses a bad number or a foreign origin before the API', async () => {
    expect(await requestPhoneCodeForHook({ phone: '0912' })).toEqual({
      ok: false,
      status: 400,
      code: 'INVALID_REQUEST',
    })
    request.origin = 'https://attacker.example'
    expect(
      await requestPhoneCodeForHook({ phone: '09121234567' })
    ).toMatchObject({ ok: false, status: 403 })
    expect(upstream).toEqual([])
  })

  it.each([
    [400, 'Enter an Iranian mobile number (09…)', 'AUTH_PHONE_INVALID', {}],
    [
      409,
      'This phone number is already used by another account',
      'USER_PHONE_TAKEN',
      {},
    ],
    [
      429,
      'A code was sent recently. Try again in 42 seconds',
      'AUTH_CODE_RATE_LIMITED',
      { retryAfterSeconds: 42 },
    ],
    [
      429,
      'Too many attempts. Try again in 900 seconds',
      'AUTH_CODE_TOO_MANY_ATTEMPTS',
      { retryAfterSeconds: 900 },
    ],
    [503, 'SMS sign-in is not available right now', 'AUTH_SMS_UNAVAILABLE', {}],
  ])('passes on %i %s', async (status, message, code, extra) => {
    server.use(
      http.post(`${apiOrigin}/auth/phone/request-code`, () =>
        failure(status, message, code)
      )
    )
    expect(await requestPhoneCodeForHook({ phone: '09121234567' })).toEqual({
      ok: false,
      status,
      code,
      isNetworkError: false,
      ...extra,
    })
  })
})

/** BE-AUTH-11, `PhoneAuthService.lookup`: `{ phone, hasAccount, hasPassword }`. */
const looked = (hasAccount: boolean, hasPassword: boolean) =>
  HttpResponse.json(
    { data: { phone: '09121234567', hasAccount, hasPassword }, errors: null },
    { status: 201 }
  )

describe('lookup (FE-AUTH-07)', () => {
  it.each([
    [false, false],
    [true, false],
    [true, true],
  ])(
    'sends the normalised number and returns hasAccount %s, hasPassword %s',
    async (hasAccount, hasPassword) => {
      server.use(
        http.post(
          `${apiOrigin}/auth/phone/lookup`,
          async ({ request: req }) => {
            upstream.push({
              path: 'lookup',
              body: await req.json(),
              auth: req.headers.get('authorization'),
            })
            return looked(hasAccount, hasPassword)
          }
        )
      )
      expect(await phoneLookupForHook({ phone: '+98 ۹۱۲ ۱۲۳ ۴۵۶۷' })).toEqual({
        ok: true,
        data: { phone: '09121234567', hasAccount, hasPassword },
      })
      // No code is asked for and no session is touched.
      expect(upstream).toEqual([
        { path: 'lookup', body: { phone: '09121234567' }, auth: null },
      ])
      expect(request.setCookie).not.toHaveBeenCalled()
    }
  )

  it('refuses a bad number or a foreign origin before the API', async () => {
    const reached = vi.fn()
    server.use(
      http.post(`${apiOrigin}/auth/phone/lookup`, () => {
        reached()
        return looked(false, false)
      })
    )
    expect(await phoneLookupForHook({ phone: '0912' })).toEqual({
      ok: false,
      status: 400,
      code: 'INVALID_REQUEST',
    })
    request.origin = 'https://attacker.example'
    expect(await phoneLookupForHook({ phone: '09121234567' })).toMatchObject({
      ok: false,
      status: 403,
    })
    expect(reached).not.toHaveBeenCalled()
  })

  it.each([
    [400, 'phone must be a string', 'BAD_REQUEST'],
    [400, 'Enter an Iranian mobile number (09…)', 'AUTH_PHONE_INVALID'],
    [
      409,
      'This phone number is already used by another account',
      'USER_PHONE_TAKEN',
    ],
    [429, 'ThrottlerException: Too Many Requests', 'TOO_MANY_REQUESTS'],
  ])('passes on %i %s', async (status, message, code) => {
    server.use(
      http.post(`${apiOrigin}/auth/phone/lookup`, () =>
        failure(status, message, code)
      )
    )
    expect(await phoneLookupForHook({ phone: '09121234567' })).toEqual({
      ok: false,
      status,
      code,
      isNetworkError: false,
    })
  })

  it('reports a network failure', async () => {
    server.use(
      http.post(`${apiOrigin}/auth/phone/lookup`, () => HttpResponse.error())
    )
    expect(await phoneLookupForHook({ phone: '09121234567' })).toMatchObject({
      ok: false,
      isNetworkError: true,
    })
  })

  it('refuses a success without hasPassword', async () => {
    server.use(
      http.post(`${apiOrigin}/auth/phone/lookup`, () =>
        HttpResponse.json(
          { data: { phone: '09121234567', hasAccount: true }, errors: null },
          { status: 201 }
        )
      )
    )
    expect(await phoneLookupForHook({ phone: '09121234567' })).toEqual({
      ok: false,
      code: 'INVALID_AUTH_RESPONSE',
    })
  })
})

describe('verify', () => {
  it('sets the session cookie and returns the routing facts, never the token', async () => {
    const result = await verifyPhoneCodeForHook({
      phone: '09121234567',
      code: '۱۲۳۴۵',
    })
    expect(result).toEqual({
      ok: true,
      data: {
        user: {
          id: 77,
          email: null,
          alias: null,
          isVerified: true,
          displayName: null,
          hasPassword: false,
          // The page's category (FE-AUTH-08): none with no page.
          categoryId: null,
          // Not published (C-16): "View my page" goes to the dashboard.
          isPublish: false,
        },
        // The verified number, for the account step's line (FE-AUTH-04).
        phone: '09121234567',
        isNewUser: true,
        needsProfile: true,
        hasPassword: false,
      },
    })
    expect(JSON.stringify(result)).not.toContain(token())
    expect(upstream).toEqual([
      {
        path: 'verify',
        body: { phone: '09121234567', code: '12345' },
        auth: null,
      },
    ])
    expect(request.setCookie).toHaveBeenCalledWith(
      sessionCookieName,
      token(),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
    )
  })

  it('refuses a code that is not 5 digits before the API', async () => {
    expect(
      await verifyPhoneCodeForHook({ phone: '09121234567', code: '1234' })
    ).toMatchObject({ ok: false, status: 400, code: 'INVALID_REQUEST' })
    expect(upstream).toEqual([])
  })

  it.each([
    [400, 'Wrong code', 'AUTH_CODE_INVALID', {}],
    [400, 'This code has expired. Request a new one', 'AUTH_CODE_EXPIRED', {}],
    [
      429,
      'Too many attempts. Try again in 615 seconds',
      'AUTH_CODE_TOO_MANY_ATTEMPTS',
      { retryAfterSeconds: 615 },
    ],
    [409, 'This phone number is already used', 'USER_PHONE_TAKEN', {}],
    [400, 'Enter an Iranian mobile number (09…)', 'AUTH_PHONE_INVALID', {}],
  ])(
    'passes on %i %s and sets no session',
    async (status, message, code, extra) => {
      server.use(
        http.post(`${apiOrigin}/auth/phone/verify`, () =>
          failure(status, message, code)
        )
      )
      expect(
        await verifyPhoneCodeForHook({ phone: '09121234567', code: '12345' })
      ).toEqual({ ok: false, status, code, isNetworkError: false, ...extra })
      expect(request.setCookie).not.toHaveBeenCalled()
    }
  )

  it('refuses a success without a token', async () => {
    server.use(
      http.post(`${apiOrigin}/auth/phone/verify`, () =>
        signedIn({ token: undefined })
      )
    )
    expect(
      await verifyPhoneCodeForHook({ phone: '09121234567', code: '12345' })
    ).toEqual({ ok: false, code: 'INVALID_AUTH_RESPONSE' })
    expect(request.setCookie).not.toHaveBeenCalled()
  })
})

describe('login with password', () => {
  it('signs a returning account in', async () => {
    expect(
      await phoneLoginForHook({ phone: '9121234567', password: 'a-password' })
    ).toEqual({
      ok: true,
      data: {
        user: {
          id: 77,
          email: null,
          alias: null,
          isVerified: true,
          displayName: null,
          hasPassword: false,
          // The page's category (FE-AUTH-08): none with no page.
          categoryId: null,
          // Not published (C-16): "View my page" goes to the dashboard.
          isPublish: false,
        },
        // The verified number, for the account step's line (FE-AUTH-04).
        phone: '09121234567',
        isNewUser: false,
        needsProfile: false,
        hasPassword: false,
      },
    })
    expect(upstream[0]?.body).toEqual({
      phone: '09121234567',
      password: 'a-password',
    })
    expect(request.setCookie).toHaveBeenCalledOnce()
  })

  it('passes on the one generic credentials failure', async () => {
    server.use(
      http.post(`${apiOrigin}/auth/phone/login`, () =>
        failure(
          401,
          'Phone number or password are wrong',
          'AUTH_INVALID_CREDENTIALS'
        )
      )
    )
    expect(
      await phoneLoginForHook({ phone: '09121234567', password: 'wrong' })
    ).toEqual({
      ok: false,
      status: 401,
      code: 'AUTH_INVALID_CREDENTIALS',
      isNetworkError: false,
    })
    expect(request.setCookie).not.toHaveBeenCalled()
  })
})

describe('complete account', () => {
  beforeEach(() => {
    request.cookies.set(sessionCookieName, token())
  })

  it('sends the trimmed name and, only when given, the password', async () => {
    expect(await completeAccountForHook({ displayName: '  Sara ' })).toEqual({
      ok: true,
      data: { hasPassword: false },
    })
    expect(
      await completeAccountForHook({
        displayName: 'Sara',
        password: 'eight-chars',
      })
    ).toMatchObject({ ok: true })
    expect(upstream).toEqual([
      {
        path: 'account',
        body: { displayName: 'Sara' },
        auth: `Bearer ${token()}`,
      },
      {
        path: 'account',
        body: { displayName: 'Sara', password: 'eight-chars' },
        auth: `Bearer ${token()}`,
      },
    ])
  })

  it('refuses a short name or password, and a missing session, before the API', async () => {
    expect(await completeAccountForHook({ displayName: 'S' })).toMatchObject({
      ok: false,
      status: 400,
    })
    expect(
      await completeAccountForHook({ displayName: 'Sara', password: 'short' })
    ).toMatchObject({ ok: false, status: 400 })
    request.cookies.clear()
    expect(await completeAccountForHook({ displayName: 'Sara' })).toMatchObject(
      { ok: false, status: 401 }
    )
    expect(upstream).toEqual([])
  })

  it.each([
    [409, 'This account already has a password', 'AUTH_PASSWORD_ALREADY_SET'],
    [404, 'User not found', 'USER_NOT_FOUND'],
  ])('passes on %i %s', async (status, message, code) => {
    server.use(
      http.put(`${apiOrigin}/auth/account`, () =>
        failure(status, message, code)
      )
    )
    expect(
      await completeAccountForHook({
        displayName: 'Sara',
        password: 'longer-pw',
      })
    ).toEqual({ ok: false, status, code, isNetworkError: false })
  })
})

describe('alias availability (BE-AUTH-09)', () => {
  /** `GET /auth/alias/availability`: all four keys, always. */
  function availability(data: Record<string, unknown>) {
    return HttpResponse.json({ data, errors: null })
  }
  let asked: { alias: string | null; auth: string | null }[] = []

  beforeEach(() => {
    asked = []
    request.cookies.set(sessionCookieName, token())
  })

  function respond(response: () => Response) {
    server.use(
      http.get(`${apiOrigin}/auth/alias/availability`, ({ request: req }) => {
        asked.push({
          alias: new URL(req.url).searchParams.get('alias'),
          auth: req.headers.get('authorization'),
        })
        return response()
      })
    )
  }

  it('asks with the session token and the alias as typed', async () => {
    respond(() =>
      availability({
        alias: 'atelier',
        available: false,
        reason: 'taken',
        suggestions: ['atelier_', 'atelier_art', 'atelier1405'],
      })
    )
    expect(await aliasAvailabilityForHook({ alias: 'Atelier' })).toEqual({
      ok: true,
      data: {
        alias: 'atelier',
        available: false,
        reason: 'taken',
        suggestions: ['atelier_', 'atelier_art', 'atelier1405'],
      },
    })
    expect(asked).toEqual([{ alias: 'Atelier', auth: `Bearer ${token()}` }])
  })

  it('passes on an available alias with no reason', async () => {
    respond(() =>
      availability({
        alias: 'sara',
        available: true,
        reason: null,
        suggestions: [],
      })
    )
    const result = await aliasAvailabilityForHook({ alias: 'sara' })
    expect(result.ok && result.data.available).toBe(true)
  })

  it('passes the throttle on as a 429, for the step to treat as unknown', async () => {
    respond(() => failure(429, 'ThrottlerException', 'TOO_MANY_REQUESTS'))
    expect(await aliasAvailabilityForHook({ alias: 'sara' })).toMatchObject({
      ok: false,
      status: 429,
    })
  })

  it('refuses a malformed answer', async () => {
    respond(() => availability({ alias: 'sara', available: true }))
    expect(await aliasAvailabilityForHook({ alias: 'sara' })).toMatchObject({
      ok: false,
      code: 'INVALID_AUTH_RESPONSE',
    })
  })

  it('checks Origin and the session before asking', async () => {
    respond(() => availability({}))
    request.origin = 'https://attacker.example'
    expect(await aliasAvailabilityForHook({ alias: 'sara' })).toMatchObject({
      ok: false,
      status: 403,
    })
    request.origin = 'https://fellowa.test'
    request.cookies.clear()
    expect(await aliasAvailabilityForHook({ alias: 'sara' })).toMatchObject({
      ok: false,
      status: 401,
    })
    expect(asked).toEqual([])
  })
})
