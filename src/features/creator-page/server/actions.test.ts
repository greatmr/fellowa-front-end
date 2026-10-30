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
const { setFollowingAction } = await import('./actions')
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

const calls: {
  method: string
  url: string
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
  calls.length = 0
  server.use(
    http.get(`${apiOrigin}/user/42/profile`, () =>
      HttpResponse.json({
        data: {
          id: 42,
          email: 'me@example.com',
          alias: 'me',
          isVerified: true,
        },
        errors: null,
      })
    ),
    http.post(`${apiOrigin}/subscription/follow`, async ({ request: r }) => {
      calls.push({
        method: 'POST',
        url: r.url,
        body: await r.json(),
        auth: r.headers.get('authorization'),
      })
      return HttpResponse.json({ data: { message: 'Followed' }, errors: null })
    }),
    http.delete(`${apiOrigin}/subscription/follow`, ({ request: r }) => {
      calls.push({
        method: 'DELETE',
        url: r.url,
        body: null,
        auth: r.headers.get('authorization'),
      })
      return HttpResponse.json({
        data: { message: 'Unfollowed' },
        errors: null,
      })
    })
  )
})

describe('follow server boundary (FE-PAGE-02)', () => {
  it('follows as the signed-in account', async () => {
    expect(await setFollowingAction({ creatorId: 4, follow: true })).toEqual({
      ok: true,
      data: { isFollowing: true },
    })
    expect(calls).toEqual([
      {
        method: 'POST',
        url: `${apiOrigin}/subscription/follow`,
        body: { followingUserId: 4 },
        auth: `Bearer ${token()}`,
      },
    ])
  })

  it('unfollows with the creator id as a query parameter', async () => {
    expect(await setFollowingAction({ creatorId: 4, follow: false })).toEqual({
      ok: true,
      data: { isFollowing: false },
    })
    expect(calls[0]).toMatchObject({
      method: 'DELETE',
      url: `${apiOrigin}/subscription/follow?followingUserId=4`,
    })
  })

  it.each([
    [true, 409, 'SUB_ALREADY_FOLLOWING', 'post'],
    [false, 404, 'SUB_FOLLOW_NOT_FOUND', 'delete'],
  ] as const)(
    'treats follow=%p answered %i %s as already done',
    async (follow, status, code, method) => {
      server.use(
        http[method](`${apiOrigin}/subscription/follow`, () =>
          failure(status, code)
        )
      )

      expect(await setFollowingAction({ creatorId: 4, follow })).toEqual({
        ok: true,
        data: { isFollowing: follow },
      })
    }
  )

  it('passes a refusal such as self-follow through', async () => {
    server.use(
      http.post(`${apiOrigin}/subscription/follow`, () =>
        failure(400, 'SUB_FOLLOW_SELF')
      )
    )

    expect(await setFollowingAction({ creatorId: 42, follow: true })).toEqual(
      expect.objectContaining({
        ok: false,
        status: 400,
        code: 'SUB_FOLLOW_SELF',
      })
    )
  })

  it('needs a session', async () => {
    request.cookie = ''

    expect(await setFollowingAction({ creatorId: 4, follow: true })).toEqual({
      ok: false,
      status: 401,
      code: 'SESSION_EXPIRED',
    })
    expect(calls).toEqual([])
  })

  it('reports an unreachable session check as a failure, not an expiry', async () => {
    server.use(
      http.get(`${apiOrigin}/user/42/profile`, () => HttpResponse.error())
    )

    expect(await setFollowingAction({ creatorId: 4, follow: true })).toEqual({
      ok: false,
      code: 'SESSION_CHECK_FAILED',
      isNetworkError: true,
    })
    expect(calls).toEqual([])
  })

  it('refuses a cross-site request', async () => {
    request.origin = 'https://attacker.example'

    expect(await setFollowingAction({ creatorId: 4, follow: true })).toEqual({
      ok: false,
      status: 403,
      code: 'INVALID_REQUEST',
    })
    expect(calls).toEqual([])
  })

  it.each([0, -1, 1.5, 2_147_483_648])(
    'refuses creator id %p without calling the API',
    async (creatorId) => {
      expect(await setFollowingAction({ creatorId, follow: true })).toEqual({
        ok: false,
        status: 400,
        code: 'INVALID_REQUEST',
      })
      expect(calls).toEqual([])
    }
  )
})
