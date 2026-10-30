import { HttpResponse, http } from 'msw'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '../../../../test/msw/server'

const request = vi.hoisted(() => ({
  origin: 'https://fellowa.test',
  cookie: '',
}))
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ origin: request.origin }),
  cookies: async () => ({
    get: () =>
      request.cookie
        ? { name: 'fellowa_session', value: request.cookie }
        : undefined,
  }),
}))

const apiOrigin = 'https://api.fellowa.test/api'
vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', apiOrigin)
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fellowa.test')
const { changePasswordAction, updatePersonalAction } = await import('./actions')
const { getPersonal } = await import('../api/settings-api')
afterAll(() => vi.unstubAllEnvs())

// Fixed for the file: a token built from the clock on each call would differ
// across a second boundary, and the handlers compare tokens exactly.
const tokenExpiry = Math.floor(Date.now() / 1000) + 3600

function token(userId = 42) {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: tokenExpiry })
  ).toString('base64url')
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.backendSignature`
}

const sent: {
  method: string
  path: string
  body: unknown
  auth: string | null
}[] = []
const failure = (status: number, code: string) =>
  HttpResponse.json(
    { data: null, errors: [{ message: code, code }] },
    { status }
  )

beforeEach(() => {
  request.origin = 'https://fellowa.test'
  request.cookie = token()
  sent.length = 0
  const record = async (r: Request) =>
    sent.push({
      method: r.method,
      path: new URL(r.url).pathname,
      body: await r.json(),
      auth: r.headers.get('authorization'),
    })
  server.use(
    http.get(`${apiOrigin}/user/:id/profile`, ({ params }) =>
      HttpResponse.json({
        data: {
          id: Number(params.id),
          email: 'me@example.com',
          alias: null,
          isVerified: true,
        },
        errors: null,
      })
    ),
    http.put(`${apiOrigin}/user/personal`, async ({ request: r }) => {
      await record(r)
      return HttpResponse.json({
        data: { message: 'Personal info updated' },
        errors: null,
      })
    }),
    http.put(`${apiOrigin}/auth/reset-password`, async ({ request: r }) => {
      await record(r)
      return HttpResponse.json({
        data: { message: 'Password changed successfully' },
        errors: null,
      })
    })
  )
})

const details = {
  firstName: ' Sara ',
  lastName: 'Karimi',
  phoneNumber: '۰۹۱۲۱۲۳۴۵۶۷',
}

describe('settings server boundary (FE-SET-01)', () => {
  it('saves personal details for the signed-in account, normalized', async () => {
    expect(await updatePersonalAction(42, details)).toEqual({
      ok: true,
      data: {
        firstName: 'Sara',
        lastName: 'Karimi',
        phoneNumber: '09121234567',
      },
    })
    expect(sent).toEqual([
      {
        method: 'PUT',
        path: '/api/user/personal',
        body: {
          firstName: 'Sara',
          lastName: 'Karimi',
          phoneNumber: '09121234567',
        },
        auth: `Bearer ${token()}`,
      },
    ])
  })

  it('changes the password with the current one', async () => {
    expect(
      await changePasswordAction(42, {
        currentPassword: 'old-pass',
        newPassword: 'new-password',
      })
    ).toEqual({ ok: true, data: null })
    expect(sent[0]).toMatchObject({
      path: '/api/auth/reset-password',
      body: { currentPassword: 'old-pass', newPassword: 'new-password' },
    })
  })

  it('passes a wrong current password through as its code', async () => {
    server.use(
      http.put(`${apiOrigin}/auth/reset-password`, () =>
        failure(400, 'AUTH_WRONG_PASSWORD')
      )
    )

    expect(
      await changePasswordAction(42, {
        currentPassword: 'nope',
        newPassword: 'new-password',
      })
    ).toMatchObject({ ok: false, status: 400, code: 'AUTH_WRONG_PASSWORD' })
  })

  it.each([
    [
      'another account is signed in',
      () => (request.cookie = token(7)),
      401,
      'SESSION_CHANGED',
    ],
    [
      'nobody is signed in',
      () => (request.cookie = ''),
      401,
      'SESSION_EXPIRED',
    ],
    [
      'the request is cross-site',
      () => (request.origin = 'https://attacker.example'),
      403,
      'INVALID_REQUEST',
    ],
  ])('refuses when %s', async (_name, arrange, status, code) => {
    arrange()

    expect(await updatePersonalAction(42, details)).toEqual({
      ok: false,
      status,
      code,
    })
    expect(
      await changePasswordAction(42, {
        currentPassword: 'old',
        newPassword: 'new-password',
      })
    ).toEqual({ ok: false, status, code })
    expect(sent).toEqual([])
  })

  it.each([
    [{ ...details, phoneNumber: '12345' }],
    [{ ...details, firstName: 'x'.repeat(61) }],
  ])(
    'refuses invalid personal input %j without calling the API',
    async (input) => {
      expect(await updatePersonalAction(42, input)).toEqual({
        ok: false,
        status: 400,
        code: 'INVALID_REQUEST',
      })
      expect(sent).toEqual([])
    }
  )

  it('reports an unreachable session check as a failure, not an expiry', async () => {
    server.use(
      http.get(`${apiOrigin}/user/:id/profile`, () => HttpResponse.error())
    )

    expect(await updatePersonalAction(42, details)).toEqual({
      ok: false,
      code: 'SESSION_CHECK_FAILED',
      isNetworkError: true,
    })
    expect(sent).toEqual([])
  })

  it('refuses a short new password without calling the API', async () => {
    expect(
      await changePasswordAction(42, {
        currentPassword: 'old',
        newPassword: 'short',
      })
    ).toMatchObject({ ok: false, status: 400 })
    expect(sent).toEqual([])
  })
})

describe('getPersonal (BE-USER-06)', () => {
  it('reads an account with nothing saved yet as an empty form', async () => {
    server.use(
      http.get(`${apiOrigin}/user/personal`, () =>
        failure(404, 'USER_PERSONAL_NOT_FOUND')
      )
    )

    expect(await getPersonal(token())).toEqual({
      firstName: '',
      lastName: '',
      phoneNumber: '',
    })
  })

  it('lets any other failure through', async () => {
    server.use(http.get(`${apiOrigin}/user/personal`, () => failure(500, 'X')))

    await expect(getPersonal(token())).rejects.toMatchObject({ status: 500 })
  })
})
