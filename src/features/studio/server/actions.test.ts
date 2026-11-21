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
const { publishPageAction } = await import('./actions')
const { getDashboardProfile, getRecentPosts } =
  await import('../api/dashboard-api')
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

const ok = (data: unknown) => HttpResponse.json({ data, errors: null })
const failure = (status: number, code: string) =>
  HttpResponse.json(
    { data: null, errors: [{ message: code, code }] },
    { status }
  )

const published: { auth: string | null }[] = []

beforeEach(() => {
  request.origin = 'https://fellowa.test'
  request.cookie = token()
  published.length = 0
  server.use(
    http.get(`${apiOrigin}/user/:id/profile`, ({ params }) =>
      ok({
        id: Number(params.id),
        email: 'me@example.com',
        alias: 'sara',
        isVerified: true,
        displayName: 'Sara',
        hasPassword: true,
        isPublish: false,
        pageName: null,
        categoryId: null,
        personal: { phoneNumber: '09121234567' },
        about: null,
        images: { profile: null, header: null },
      })
    ),
    http.put(`${apiOrigin}/user/publish`, ({ request: r }) => {
      published.push({ auth: r.headers.get('authorization') })
      return ok({ message: 'Page published' })
    })
  )
})

describe('publishPageAction (FE-STUDIO-01)', () => {
  it('publishes for the signed-in account with its own token', async () => {
    expect(await publishPageAction(42)).toEqual({ ok: true, data: null })
    expect(published).toEqual([{ auth: `Bearer ${token()}` }])
  })

  it('refuses a request from another origin before calling the API', async () => {
    request.origin = 'https://evil.test'

    expect(await publishPageAction(42)).toMatchObject({
      ok: false,
      status: 403,
    })
    expect(published).toEqual([])
  })

  it('refuses when the cookie belongs to a different account', async () => {
    expect(await publishPageAction(7)).toMatchObject({
      ok: false,
      status: 401,
      code: 'SESSION_CHANGED',
    })
    expect(published).toEqual([])
  })

  it('refuses without a session', async () => {
    request.cookie = ''

    expect(await publishPageAction(42)).toMatchObject({
      ok: false,
      status: 401,
      code: 'SESSION_EXPIRED',
    })
  })

  it('passes the backend refusal through as its code', async () => {
    server.use(
      http.put(`${apiOrigin}/user/publish`, () =>
        failure(400, 'USER_ALIAS_REQUIRED')
      )
    )

    expect(await publishPageAction(42)).toMatchObject({
      ok: false,
      status: 400,
      code: 'USER_ALIAS_REQUIRED',
    })
  })
})

/** A `GET /content` item as `formatForOwner` + `applyContentAccess` build it. */
function ownPost(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: 'text',
    title: `Post ${id}`,
    text: 'Body',
    tags: null,
    isApprove: true,
    visibility: {
      contentId: id,
      type: true,
      datePublished: '2026-11-20T08:00:00.000Z',
      earlyAccess: false,
      dateEarly: null,
      textPreview: null,
    },
    images: [],
    videos: [],
    audios: [],
    links: [],
    polls: [],
    attachments: [],
    createdAt: '2026-11-20T08:00:00.000Z',
    paywallPosition: null,
    access: 'FULL',
    ...overrides,
  }
}

describe('getDashboardProfile', () => {
  function stub({
    tiers = [] as unknown[],
    payment = failure(404, 'USER_PAYMENT_NOT_FOUND') as Response,
  } = {}) {
    server.use(
      http.get(`${apiOrigin}/tire`, () => ok(tiers)),
      http.get(`${apiOrigin}/user/payment`, () => payment)
    )
  }

  it('reads a brand-new creator as everything still to do except the username', async () => {
    stub()

    expect(await getDashboardProfile(token(), 42)).toEqual({
      facts: {
        username: 'sara',
        isPublished: false,
        hasProfileImages: false,
        hasTier: false,
        hasPayoutDetails: false,
      },
      identity: {
        pageName: null,
        displayName: 'Sara',
        alias: 'sara',
        avatarUrl: null,
      },
    })
  })

  it('reads each step from the route that owns it', async () => {
    stub({
      tiers: [{ id: 1, title: 'Gold' }],
      payment: ok({ ibanNumber: 'IR120000000000000000000000' }),
    })

    expect((await getDashboardProfile(token(), 42)).facts).toMatchObject({
      hasTier: true,
      hasPayoutDetails: true,
    })
  })

  it('does not hide a real failure behind the missing-payment case', async () => {
    stub({ payment: failure(500, 'INTERNAL_ERROR') })

    await expect(getDashboardProfile(token(), 42)).rejects.toMatchObject({
      status: 500,
    })
  })
})

describe('getRecentPosts', () => {
  it('reads the owner list with its own token, drafts and tier-only posts included', async () => {
    const auth: (string | null)[] = []
    server.use(
      http.get(`${apiOrigin}/content`, ({ request: r }) => {
        auth.push(r.headers.get('authorization'))
        return ok([
          ownPost(12, {
            createdAt: '2026-11-21T08:00:00.000Z',
            visibility: {
              contentId: 12,
              type: false,
              datePublished: null,
              earlyAccess: false,
              dateEarly: null,
              textPreview: null,
            },
          }),
          ownPost(9),
        ])
      })
    )

    expect(await getRecentPosts(token())).toEqual([
      {
        id: 12,
        title: 'Post 12',
        publishedAt: null,
        createdAt: '2026-11-21T08:00:00.000Z',
        audience: 'tiers',
      },
      {
        id: 9,
        title: 'Post 9',
        publishedAt: '2026-11-20T08:00:00.000Z',
        createdAt: '2026-11-20T08:00:00.000Z',
        audience: 'public',
      },
    ])
    expect(auth).toEqual([`Bearer ${token()}`])
  })

  it('rejects a list without the fields it shows', async () => {
    server.use(http.get(`${apiOrigin}/content`, () => ok([{ id: 9 }])))

    await expect(getRecentPosts(token())).rejects.toThrow(
      'Invalid dashboard response'
    )
  })
})
