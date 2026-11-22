import { HttpResponse, http } from 'msw'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '../../../../test/msw/server'
import { ok, rawFullMember, rawTeaser } from '../test/fixtures'

const request = vi.hoisted(() => ({ cookie: '' }))
vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/headers', () => ({
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
const { loadReaderPost } = await import('./load-reader-post')
afterAll(() => vi.unstubAllEnvs())

function token(userId = 42) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp })).toString(
    'base64url'
  )
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.backendSignature`
}

const fail = (status: number, code: string) =>
  HttpResponse.json(
    { data: null, errors: [{ message: code, code }] },
    { status }
  )

let calls: Array<{ path: string; authorization: string | null }> = []
const record = (req: Request) =>
  calls.push({
    path: new URL(req.url).pathname,
    authorization: req.headers.get('authorization'),
  })

beforeEach(() => {
  request.cookie = ''
  calls = []
})

describe('loadReaderPost (FE-CONT-01)', () => {
  it('reads an anonymous visitor through GET /landing/posts/:id, with no token', async () => {
    server.use(
      http.get(`${apiOrigin}/landing/posts/31`, ({ request: req }) => {
        record(req)
        return HttpResponse.json(ok(rawTeaser()))
      })
    )

    expect(await loadReaderPost('4', '31')).toMatchObject({
      creatorId: 4,
      viewer: 'anonymous',
      post: { access: 'TEASER' },
    })
    expect(calls).toEqual([
      { path: '/api/landing/posts/31', authorization: null },
    ])
  })

  it('reads a signed-in viewer through GET /content/:id with the cookie token', async () => {
    request.cookie = token()
    server.use(
      http.get(`${apiOrigin}/content/31`, ({ request: req }) => {
        record(req)
        return HttpResponse.json(ok(rawFullMember()))
      })
    )

    expect(await loadReaderPost('4', '31')).toMatchObject({
      viewer: 'signedIn',
      post: { access: 'FULL' },
    })
    expect(calls).toEqual([
      { path: '/api/content/31', authorization: `Bearer ${request.cookie}` },
    ])
  })

  it('falls back to the visitor read when the backend refuses the token (401)', async () => {
    request.cookie = token()
    server.use(
      http.get(`${apiOrigin}/content/31`, ({ request: req }) => {
        record(req)
        return fail(401, 'UNAUTHORIZED')
      }),
      http.get(`${apiOrigin}/landing/posts/31`, ({ request: req }) => {
        record(req)
        return HttpResponse.json(ok(rawTeaser()))
      })
    )

    expect(await loadReaderPost('4', '31')).toMatchObject({
      viewer: 'anonymous',
      post: { access: 'TEASER' },
    })
    expect(calls.map((call) => call.path)).toEqual([
      '/api/content/31',
      '/api/landing/posts/31',
    ])
    expect(calls[1]?.authorization).toBeNull()
  })

  it('treats a cookie that is not a token as no session', async () => {
    request.cookie = 'not-a-jwt'
    server.use(
      http.get(`${apiOrigin}/landing/posts/31`, () =>
        HttpResponse.json(ok(rawTeaser()))
      )
    )

    expect(await loadReaderPost('4', '31')).toMatchObject({
      viewer: 'anonymous',
    })
  })

  it.each([
    ['an anonymous visitor', '', '/landing/posts/31'],
    ['a signed-in viewer', 'token', '/content/31'],
  ])(
    'answers null for a 404 (unknown, draft or DENY) for %s',
    async (_name, cookie, path) => {
      request.cookie = cookie ? token() : ''
      server.use(
        http.get(`${apiOrigin}${path}`, () => fail(404, 'CONTENT_NOT_FOUND'))
      )

      expect(await loadReaderPost('4', '31')).toBeNull()
    }
  )

  it('does not fall back on a 404 from the signed-in read', async () => {
    request.cookie = token()
    server.use(
      http.get(`${apiOrigin}/content/31`, ({ request: req }) => {
        record(req)
        return fail(404, 'CONTENT_NOT_FOUND')
      })
    )

    expect(await loadReaderPost('4', '31')).toBeNull()
    expect(calls).toHaveLength(1)
  })

  it.each([
    ['a server error', () => fail(500, 'INTERNAL')],
    ['a malformed body', () => HttpResponse.json(ok({ id: 31 }))],
  ])('lets %s reach the error boundary', async (_name, respond) => {
    server.use(http.get(`${apiOrigin}/landing/posts/31`, respond))

    await expect(loadReaderPost('4', '31')).rejects.toThrow()
  })

  it.each([
    ['0', '31'],
    ['4', '031'],
    ['4', '1e3'],
    ['abc', '31'],
    ['4', '2147483648'],
  ])(
    'answers null for /creators/%s/posts/%s without a request',
    async (c, p) => {
      expect(await loadReaderPost(c, p)).toBeNull()
    }
  )
})
