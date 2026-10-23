import { HttpResponse, http } from 'msw'
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { server } from '../../../../test/msw/server'

const request = vi.hoisted(() => ({
  origin: 'https://fellowa.test' as string | null,
  contentType: null as string | null,
  nextAction: null as string | null,
  cookies: new Map<string, string>(),
  setCookie: vi.fn(),
  connection: vi.fn<() => Promise<void>>(),
  redirect: vi.fn((destination: unknown): never => {
    throw new Error(`REDIRECT:${JSON.stringify(destination)}`)
  }),
}))

vi.mock('next/server', () => ({ connection: request.connection }))

vi.mock('next/headers', () => ({
  headers: async () => {
    const headers = new Headers()
    if (request.origin !== null) headers.set('origin', request.origin)
    if (request.contentType !== null)
      headers.set('content-type', request.contentType)
    if (request.nextAction !== null)
      headers.set('next-action', request.nextAction)
    return headers
  },
  cookies: async () => ({
    get: (name: string) => {
      const value = request.cookies.get(name)
      return value === undefined ? undefined : { name, value }
    },
    set: request.setCookie,
  }),
}))
vi.mock('@/i18n/navigation', () => ({ redirect: request.redirect }))

const apiOrigin = 'https://api.fellowa.test/api'
const now = Date.parse('2026-10-23T09:00:00Z')
const idle = { status: 'idle' } as const
vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', apiOrigin)
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fellowa.test')
vi.stubEnv('NODE_ENV', 'production')

const {
  loginAction,
  registerAction,
  verifyEmailAction,
  resendEmailAction,
  logoutAction,
} = await import('./actions')
const {
  getSession,
  readSession,
  authenticateToken,
  saveSession,
  sessionCookieName,
} = await import('./session')

function token(userId = 42, expiry = now / 1000 + 3600): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: expiry })
  ).toString('base64url')
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.backendSignature`
}

function form(values: Record<string, string> = {}) {
  const data = new FormData()
  for (const [name, value] of Object.entries(values)) data.set(name, value)
  return data
}

function backendFailure(status: number, code: string) {
  return HttpResponse.json(
    { data: null, errors: [{ message: 'Private backend detail', code }] },
    { status }
  )
}

let verified = false
let profileCalls = 0
let mutationCalls = 0

beforeEach(() => {
  vi.clearAllMocks()
  request.connection.mockResolvedValue(undefined)
  vi.spyOn(Date, 'now').mockReturnValue(now)
  request.origin = 'https://fellowa.test'
  request.contentType = null
  request.nextAction = null
  request.cookies.clear()
  verified = false
  profileCalls = 0
  mutationCalls = 0
  server.use(
    http.post(`${apiOrigin}/auth/:mode`, () => {
      mutationCalls++
      return HttpResponse.json(
        {
          data: { token: token(), isVerified: true, user: { id: 42 } },
          errors: null,
        },
        { status: 201 }
      )
    }),
    http.get(`${apiOrigin}/user/42/profile`, ({ request: upstream }) => {
      profileCalls++
      expect(upstream.headers.get('authorization')).toBe(`Bearer ${token()}`)
      return HttpResponse.json({
        data: {
          id: 42,
          email: 'creator@example.com',
          alias: null,
          isVerified: verified,
          personal: { phoneNumber: 'private' },
        },
        errors: null,
      })
    }),
    http.put(`${apiOrigin}/auth/verify-code`, ({ request: upstream }) => {
      mutationCalls++
      expect(upstream.headers.get('authorization')).toBe(`Bearer ${token()}`)
      verified = true
      return HttpResponse.json({
        data: { message: 'Account verified successfully' },
        errors: null,
      })
    }),
    http.put(`${apiOrigin}/auth/resend-code`, ({ request: upstream }) => {
      mutationCalls++
      expect(upstream.headers.get('authorization')).toBe(`Bearer ${token()}`)
      return HttpResponse.json({
        data: { message: 'Verification code sent' },
        errors: null,
      })
    })
  )
})

afterEach(() => vi.restoreAllMocks())
afterAll(() => vi.unstubAllEnvs())

describe('credential actions', () => {
  it('validates fields on the server without upstream requests or cookie writes', async () => {
    await expect(
      registerAction(
        'fa',
        '/studio',
        idle,
        form({ email: 'invalid', password: 'short' })
      )
    ).resolves.toEqual({
      status: 'error',
      fieldErrors: { email: 'email', password: 'passwordLength' },
    })
    expect(mutationCalls).toBe(0)
    expect(profileCalls).toBe(0)
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it('uses backend-validated verification state rather than login response flags', async () => {
    await expect(
      loginAction(
        'fa',
        '/studio/posts/new',
        idle,
        form({ email: 'creator@example.com', password: 'short' })
      )
    ).rejects.toThrow('REDIRECT:')
    expect(request.redirect).toHaveBeenCalledWith({
      href: {
        pathname: '/auth/verify-email',
        query: { returnTo: '/studio/posts/new' },
      },
      locale: 'fa',
    })
    expect(request.setCookie).toHaveBeenCalledWith(sessionCookieName, token(), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600,
      expires: new Date(now + 3600_000),
    })
    expect(profileCalls).toBe(1)
  })

  it('redirects verified users to the safe locale-aware destination outside the error catch', async () => {
    verified = true
    await expect(
      loginAction(
        'en',
        '/en/settings',
        idle,
        form({ email: 'creator@example.com', password: 'password' })
      )
    ).rejects.toThrow('REDIRECT:')
    expect(request.redirect).toHaveBeenCalledWith({
      href: '/settings',
      locale: 'en',
    })
  })

  it('registers and sends an unverified account to email verification with a safe fallback', async () => {
    await expect(
      registerAction(
        'en',
        '//attacker.example',
        idle,
        form({ email: 'creator@example.com', password: 'password' })
      )
    ).rejects.toThrow('REDIRECT:')
    expect(request.redirect).toHaveBeenCalledWith({
      href: { pathname: '/auth/verify-email', query: { returnTo: '/studio' } },
      locale: 'en',
    })
  })

  it.each([
    [401, 'AUTH_INVALID_CREDENTIALS', 'invalidCredentials'],
    [409, 'AUTH_EMAIL_TAKEN', 'emailTaken'],
    [429, 'TOO_MANY_REQUESTS', 'rateLimited'],
    [503, 'SERVICE_UNAVAILABLE', 'unavailable'],
  ] as const)(
    'maps %i to a translated error key without leaking backend details',
    async (status, code, expected) => {
      server.use(
        http.post(`${apiOrigin}/auth/login`, () => backendFailure(status, code))
      )
      await expect(
        loginAction(
          'fa',
          '/studio',
          idle,
          form({ email: 'creator@example.com', password: 'password' })
        )
      ).resolves.toEqual({ status: 'error', error: expected })
      expect(request.setCookie).not.toHaveBeenCalled()
    }
  )

  it('reports network errors without altering an existing session', async () => {
    server.use(http.post(`${apiOrigin}/auth/login`, () => HttpResponse.error()))
    await expect(
      loginAction(
        'fa',
        '/studio',
        idle,
        form({ email: 'creator@example.com', password: 'password' })
      )
    ).resolves.toEqual({ status: 'error', error: 'network' })
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it.each([
    { data: { token: 'not-a-jwt' }, errors: null },
    { data: { token: token(42, now / 1000 - 1) }, errors: null },
    { data: { user: { id: 42 } }, errors: null },
  ])('refuses malformed or expired upstream credentials', async (body) => {
    server.use(
      http.post(`${apiOrigin}/auth/login`, () =>
        HttpResponse.json(body, { status: 201 })
      )
    )
    await expect(
      loginAction(
        'fa',
        '/studio',
        idle,
        form({ email: 'creator@example.com', password: 'password' })
      )
    ).resolves.toEqual({ status: 'error', error: 'invalidResponse' })
    expect(request.setCookie).not.toHaveBeenCalled()
    expect(profileCalls).toBe(0)
  })
})

describe('session validation', () => {
  it.each(['read', 'authenticate'] as const)(
    'waits for a live request before %s checks the JWT clock',
    async (mode) => {
      request.cookies.set(sessionCookieName, token())
      let release: (() => void) | undefined
      const incomingRequest = new Promise<void>((resolve) => {
        release = resolve
      })
      request.connection.mockImplementationOnce(() => incomingRequest)
      vi.mocked(Date.now).mockClear()

      const session =
        mode === 'read' ? readSession() : authenticateToken(token())
      await Promise.resolve()
      expect(request.connection).toHaveBeenCalledOnce()
      expect(Date.now).not.toHaveBeenCalled()
      expect(profileCalls).toBe(0)

      release?.()
      await expect(session).resolves.toMatchObject({
        user: { id: 42, isVerified: false },
      })
      expect(Date.now).toHaveBeenCalled()
    }
  )

  it.each([undefined, 'not-a-token', token(42, now / 1000), token(0)])(
    'does not trust missing, malformed or expired cookies',
    async (value) => {
      if (value) request.cookies.set(sessionCookieName, value)
      expect(await getSession()).toBeNull()
      expect(profileCalls).toBe(0)
      expect(request.setCookie).not.toHaveBeenCalled()
    }
  )

  it('does not trust unsigned isVerified cookie contents', async () => {
    request.cookies.set(
      sessionCookieName,
      JSON.stringify({ token: token(), isVerified: true })
    )
    expect(await readSession()).toBeNull()
    expect(profileCalls).toBe(0)
  })

  it.each([401, 403, 404])(
    'returns no session for backend-rejected/forged cookies (%i)',
    async (status) => {
      request.cookies.set(sessionCookieName, token())
      server.use(
        http.get(`${apiOrigin}/user/42/profile`, () =>
          backendFailure(status, 'UNAUTHORIZED')
        )
      )
      expect(await readSession()).toBeNull()
      expect(request.setCookie).not.toHaveBeenCalled()
    }
  )

  it.each([429, 500, 503])(
    'preserves outage/rate-limit failures instead of logging out (%i)',
    async (status) => {
      request.cookies.set(sessionCookieName, token())
      server.use(
        http.get(`${apiOrigin}/user/42/profile`, () =>
          backendFailure(status, 'UNAVAILABLE')
        )
      )
      await expect(readSession()).rejects.toMatchObject({ status })
      expect(request.setCookie).not.toHaveBeenCalled()
    }
  )

  it('propagates an unavailable network without deleting the session', async () => {
    request.cookies.set(sessionCookieName, token())
    server.use(
      http.get(`${apiOrigin}/user/42/profile`, () => HttpResponse.error())
    )
    await expect(readSession()).rejects.toMatchObject({ isNetworkError: true })
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it('never persists malformed profile data', async () => {
    request.cookies.set(sessionCookieName, token())
    server.use(
      http.get(`${apiOrigin}/user/42/profile`, () =>
        HttpResponse.json({
          data: {
            id: 99,
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
  })

  it('reads a narrow backend user without extending the cookie lifetime', async () => {
    request.cookies.set(sessionCookieName, token())
    expect(await readSession()).toEqual({
      token: token(),
      user: {
        id: 42,
        email: 'creator@example.com',
        alias: null,
        isVerified: false,
      },
      expiresAt: new Date(now + 3600_000),
    })
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it('caps even a backend-validated long-lived JWT cookie at one day', async () => {
    const longToken = token(42, now / 1000 + 10 * 86400)
    server.use(
      http.get(`${apiOrigin}/user/42/profile`, () =>
        HttpResponse.json({
          data: {
            id: 42,
            email: 'creator@example.com',
            alias: null,
            isVerified: false,
          },
          errors: null,
        })
      )
    )
    await saveSession(await authenticateToken(longToken))
    expect(request.setCookie).toHaveBeenCalledWith(
      sessionCookieName,
      longToken,
      expect.objectContaining({
        maxAge: 86400,
        expires: new Date(now + 86400_000),
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      })
    )
  })
})

describe('verification, resend and logout actions', () => {
  beforeEach(() => request.cookies.set(sessionCookieName, token()))

  it('verifies the code then reloads the trusted profile without renewing the JWT', async () => {
    await expect(
      verifyEmailAction('fa', '/settings', idle, form({ code: '123456' }))
    ).rejects.toThrow('REDIRECT:')
    expect(profileCalls).toBe(2)
    expect(mutationCalls).toBe(1)
    expect(request.redirect).toHaveBeenCalledWith({
      href: '/settings',
      locale: 'fa',
    })
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it('refuses to navigate when a successful verification has not produced a verified profile', async () => {
    server.use(
      http.put(`${apiOrigin}/auth/verify-code`, () =>
        HttpResponse.json({ data: { message: 'success' }, errors: null })
      )
    )
    await expect(
      verifyEmailAction('en', '/studio', idle, form({ code: '123456' }))
    ).resolves.toEqual({ status: 'error', error: 'invalidResponse' })
    expect(request.redirect).not.toHaveBeenCalled()
  })

  it('handles verification in another tab only after rereading the profile', async () => {
    server.use(
      http.put(`${apiOrigin}/auth/verify-code`, () => {
        verified = true
        return backendFailure(400, 'AUTH_ALREADY_VERIFIED')
      })
    )
    await expect(
      verifyEmailAction('fa', '/studio', idle, form({ code: '123456' }))
    ).rejects.toThrow('REDIRECT:')
    expect(profileCalls).toBe(2)
  })

  it.each([
    [400, 'AUTH_INVALID_CODE', 'invalidCode'],
    [429, 'TOO_MANY_REQUESTS', 'rateLimited'],
  ] as const)(
    'maps verification failure %i without changing the session',
    async (status, code, expected) => {
      server.use(
        http.put(`${apiOrigin}/auth/verify-code`, () =>
          backendFailure(status, code)
        )
      )
      await expect(
        verifyEmailAction('fa', '/studio', idle, form({ code: '123456' }))
      ).resolves.toEqual({ status: 'error', error: expected })
      expect(request.setCookie).not.toHaveBeenCalled()
      expect(request.redirect).not.toHaveBeenCalled()
    }
  )

  it('validates the verification code before upstream requests', async () => {
    await expect(
      verifyEmailAction('fa', '/studio', idle, form({ code: '12345' }))
    ).resolves.toEqual({ status: 'error', fieldErrors: { code: 'code' } })
    expect(profileCalls).toBe(0)
    expect(mutationCalls).toBe(0)
  })

  it('resends a code and returns sent only after the backend confirms it', async () => {
    await expect(resendEmailAction('en', idle, form())).resolves.toEqual({
      status: 'sent',
    })
    expect(profileCalls).toBe(1)
    expect(mutationCalls).toBe(1)
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it('never resends when the fresh profile is already verified', async () => {
    verified = true
    await expect(resendEmailAction('fa', idle, form())).resolves.toEqual({
      status: 'error',
      error: 'alreadyVerified',
    })
    expect(mutationCalls).toBe(0)
  })

  it('reports backend throttling for resend without fabricating success or cooldown', async () => {
    server.use(
      http.put(`${apiOrigin}/auth/resend-code`, () =>
        backendFailure(429, 'TOO_MANY_REQUESTS')
      )
    )
    await expect(resendEmailAction('fa', idle, form())).resolves.toEqual({
      status: 'error',
      error: 'rateLimited',
    })
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it('clears expired sessions when a guarded mutation is rejected', async () => {
    server.use(
      http.put(`${apiOrigin}/auth/verify-code`, () =>
        backendFailure(401, 'UNAUTHORIZED')
      )
    )
    await expect(
      verifyEmailAction('fa', '/studio', idle, form({ code: '123456' }))
    ).resolves.toEqual({ status: 'error', error: 'expiredSession' })
    expect(request.setCookie).toHaveBeenCalledWith(
      sessionCookieName,
      '',
      expect.objectContaining({
        maxAge: 0,
        expires: new Date(0),
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
      })
    )
  })

  it('clears missing sessions and offers re-login rather than posting anonymous resend', async () => {
    request.cookies.clear()
    await expect(resendEmailAction('en', idle, form())).resolves.toEqual({
      status: 'error',
      error: 'expiredSession',
    })
    expect(profileCalls).toBe(0)
    expect(mutationCalls).toBe(0)
    expect(request.setCookie).toHaveBeenCalledOnce()
  })

  it('logs out locally without inventing a backend revocation request', async () => {
    await expect(logoutAction('en', idle, form())).rejects.toThrow('REDIRECT:')
    expect(request.redirect).toHaveBeenCalledWith({
      href: '/auth/login',
      locale: 'en',
    })
    expect(request.setCookie).toHaveBeenCalledWith(
      sessionCookieName,
      '',
      expect.objectContaining({ maxAge: 0 })
    )
    expect(profileCalls).toBe(0)
    expect(mutationCalls).toBe(0)
  })
})

describe('server action request integrity', () => {
  it.each([
    null,
    'null',
    'https://attacker.example',
    'https://fellowa.test.attacker.example',
    'https://fellowa.test/path',
    'https://fellowa.test/',
  ])(
    'rejects Origin %s before any upstream or cookie mutation',
    async (origin) => {
      request.origin = origin
      const expected = { status: 'error', error: 'invalidRequest' }
      expect(await loginAction('fa', '/studio', idle, form())).toEqual(expected)
      expect(await registerAction('fa', '/studio', idle, form())).toEqual(
        expected
      )
      expect(await verifyEmailAction('fa', '/studio', idle, form())).toEqual(
        expected
      )
      expect(await resendEmailAction('fa', idle, form())).toEqual(expected)
      expect(await logoutAction('fa', idle, form())).toEqual(expected)
      expect(profileCalls).toBe(0)
      expect(mutationCalls).toBe(0)
      expect(request.setCookie).not.toHaveBeenCalled()
      expect(request.redirect).not.toHaveBeenCalled()
    }
  )

  it('validates a runtime locale even if a caller bypasses the TypeScript signature', async () => {
    expect(
      await Reflect.apply(loginAction, undefined, [
        'unsupported',
        '/studio',
        idle,
        form(),
      ])
    ).toEqual({ status: 'error', error: 'invalidRequest' })
    expect(mutationCalls).toBe(0)
    expect(request.setCookie).not.toHaveBeenCalled()
  })
})

describe('native form feedback redirects', () => {
  beforeEach(() => {
    request.contentType = 'multipart/form-data; boundary=framework-action'
  })

  it('redirects invalid credentials to canonical login with only allowlisted feedback', async () => {
    server.use(
      http.post(`${apiOrigin}/auth/login`, () =>
        backendFailure(401, 'AUTH_INVALID_CREDENTIALS')
      )
    )
    await expect(
      loginAction(
        'en',
        '/en/settings',
        idle,
        form({ email: 'private@example.com', password: 'private-password' })
      )
    ).rejects.toThrow('REDIRECT:')
    expect(request.redirect).toHaveBeenCalledExactlyOnceWith({
      href: {
        pathname: '/auth/login',
        query: { returnTo: '/settings', feedback: 'invalidCredentials' },
      },
      locale: 'en',
    })
    expect(JSON.stringify(request.redirect.mock.calls)).not.toContain('private')
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it('retains combined field feedback without exposing submitted registration values', async () => {
    await expect(
      registerAction(
        'fa',
        '//attacker.example',
        idle,
        form({ email: 'invalid-private-email', password: 'short' })
      )
    ).rejects.toThrow('REDIRECT:')
    expect(request.redirect).toHaveBeenCalledExactlyOnceWith({
      href: {
        pathname: '/auth/register',
        query: { returnTo: '/studio', feedback: 'emailPasswordLength' },
      },
      locale: 'fa',
    })
    expect(profileCalls).toBe(0)
    expect(mutationCalls).toBe(0)
  })

  it('returns typed state for hydrated multipart actions carrying Next-Action', async () => {
    request.nextAction = 'framework-action-id'
    expect(await loginAction('fa', '/studio', idle, form())).toEqual({
      status: 'error',
      fieldErrors: { email: 'email', password: 'passwordRequired' },
    })
    expect(request.redirect).not.toHaveBeenCalled()
  })

  it('does not treat non-multipart direct action calls as native submissions', async () => {
    request.contentType = 'application/json'
    expect(await loginAction('fa', '/studio', idle, form())).toEqual({
      status: 'error',
      fieldErrors: { email: 'email', password: 'passwordRequired' },
    })
    expect(request.redirect).not.toHaveBeenCalled()
  })

  it('redirects a confirmed resend to the canonical verification page with sent feedback', async () => {
    request.cookies.set(sessionCookieName, token())
    await expect(
      resendEmailAction(
        'en',
        idle,
        form({ returnTo: '/en/settings', email: 'must-not-appear@example.com' })
      )
    ).rejects.toThrow('REDIRECT:')
    expect(request.redirect).toHaveBeenCalledExactlyOnceWith({
      href: {
        pathname: '/auth/verify-email',
        query: { returnTo: '/settings', feedback: 'sent' },
      },
      locale: 'en',
    })
    expect(mutationCalls).toBe(1)
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it('preserves native verification field feedback', async () => {
    await expect(
      verifyEmailAction(
        'fa',
        '/studio/posts/new',
        idle,
        form({ code: 'private-invalid-code' })
      )
    ).rejects.toThrow('REDIRECT:')
    expect(request.redirect).toHaveBeenCalledExactlyOnceWith({
      href: {
        pathname: '/auth/verify-email',
        query: { returnTo: '/studio/posts/new', feedback: 'code' },
      },
      locale: 'fa',
    })
    expect(mutationCalls).toBe(0)
    expect(profileCalls).toBe(0)
  })

  it.each(['verify', 'resend'] as const)(
    'moves native expired %s feedback directly to login after clearing the cookie',
    async (mode) => {
      const action =
        mode === 'verify'
          ? verifyEmailAction('fa', '/settings', idle, form({ code: '123456' }))
          : resendEmailAction('fa', idle, form({ returnTo: '/settings' }))
      await expect(action).rejects.toThrow('REDIRECT:')
      expect(request.redirect).toHaveBeenCalledExactlyOnceWith({
        href: {
          pathname: '/auth/login',
          query: { returnTo: '/settings', feedback: 'expiredSession' },
        },
        locale: 'fa',
      })
      expect(request.setCookie).toHaveBeenCalledExactlyOnceWith(
        sessionCookieName,
        '',
        expect.objectContaining({ maxAge: 0 })
      )
      expect(mutationCalls).toBe(0)
    }
  )

  it('keeps wrong-origin native requests fail-closed without upstream or cookie mutation', async () => {
    request.origin = 'https://attacker.example'
    await expect(logoutAction('en', idle, form())).rejects.toThrow('REDIRECT:')
    expect(request.redirect).toHaveBeenCalledExactlyOnceWith({
      href: {
        pathname: '/auth/login',
        query: { returnTo: '/studio', feedback: 'invalidRequest' },
      },
      locale: 'en',
    })
    expect(mutationCalls).toBe(0)
    expect(profileCalls).toBe(0)
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it('does not construct a redirect for an invalid runtime locale', async () => {
    expect(
      await Reflect.apply(loginAction, undefined, [
        'https://attacker.example',
        '/studio',
        idle,
        form(),
      ])
    ).toEqual({ status: 'error', error: 'invalidRequest' })
    expect(request.redirect).not.toHaveBeenCalled()
    expect(mutationCalls).toBe(0)
    expect(request.setCookie).not.toHaveBeenCalled()
  })

  it('lets successful native login redirects propagate without replacing them with feedback', async () => {
    verified = true
    await expect(
      loginAction(
        'en',
        '/settings',
        idle,
        form({ email: 'creator@example.com', password: 'password' })
      )
    ).rejects.toThrow('REDIRECT:')
    expect(request.redirect).toHaveBeenCalledExactlyOnceWith({
      href: '/settings',
      locale: 'en',
    })
    expect(request.setCookie).toHaveBeenCalledOnce()
  })
})
