import { HttpResponse, http } from 'msw'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '../../../../test/msw/server'

const request = vi.hoisted(() => ({ cookie: '' }))
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ origin: 'https://fellowa.test' }),
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
const { listExploreCreatorsForHook } = await import('./actions')
afterAll(() => vi.unstubAllEnvs())

function token(userId = 42) {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })
  ).toString('base64url')
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.backendSignature`
}

// BE-LAND-06 item shape (PublicProfile) — keep in step with the backend.
const creator = {
  id: 4,
  alias: 'dana',
  avatar: 'https://cdn.fellowa.test/a.png',
  header: null,
  about: {
    bio: 'Painter',
    videoUrl: null,
    facebookLink: null,
    instagramLink: null,
    twitterLink: null,
    youtubeLink: null,
  },
  categoryId: 2,
}

const seen: { path: string; search: string; auth: string | null }[] = []
let profileCalls = 0

beforeEach(() => {
  request.cookie = ''
  seen.length = 0
  profileCalls = 0
  const record = (upstream: Request) => {
    const url = new URL(upstream.url)
    seen.push({
      path: url.pathname,
      search: url.search,
      auth: upstream.headers.get('authorization'),
    })
  }
  server.use(
    http.get(`${apiOrigin}/user/:id/profile`, () => {
      profileCalls++
      return HttpResponse.json({ data: null, errors: null })
    }),
    http.get(`${apiOrigin}/landing/creators/top`, ({ request: upstream }) => {
      record(upstream)
      return HttpResponse.json({
        data: {
          items: [{ ...creator, numFollowers: '1200' }],
          page: { count: 1, total: 21, next: 2 },
        },
        errors: null,
      })
    }),
    http.get(`${apiOrigin}/landing/creators`, ({ request: upstream }) => {
      record(upstream)
      return HttpResponse.json({
        data: { items: [creator], page: { count: 1, total: 1, next: null } },
        errors: null,
      })
    })
  )
})

function topReturns(items: unknown[]) {
  server.use(
    http.get(`${apiOrigin}/landing/creators/top`, () =>
      HttpResponse.json({
        data: { items, page: { count: items.length, total: 1, next: null } },
        errors: null,
      })
    )
  )
}

describe('explore server boundary', () => {
  it('serves the anonymous list without a token, even with a cookie', async () => {
    request.cookie = token()

    expect(
      await listExploreCreatorsForHook(null, { alias: '', page: 1 })
    ).toEqual({
      ok: true,
      data: {
        items: [
          {
            id: 4,
            alias: 'dana',
            avatarUrl: 'https://cdn.fellowa.test/a.png',
            coverUrl: null,
            bio: 'Painter',
            followerCount: 1200,
          },
        ],
        total: 21,
        nextPage: 2,
      },
    })
    expect(seen).toEqual([
      { path: '/api/landing/creators/top', search: '?page=1', auth: null },
    ])
  })

  it("sends the viewer's own token, without a profile round-trip", async () => {
    request.cookie = token(42)

    await listExploreCreatorsForHook(42, { alias: '', page: 2 })

    expect(seen).toEqual([
      {
        path: '/api/landing/creators/top',
        search: '?page=2',
        auth: `Bearer ${token(42)}`,
      },
    ])
    expect(profileCalls).toBe(0)
  })

  it.each([
    ['belongs to someone else', () => token(7)],
    ['is gone', () => ''],
  ])(
    'refuses when the cookie %s, rather than caching under the wrong viewer',
    async (_name, cookie) => {
      request.cookie = cookie()

      expect(
        await listExploreCreatorsForHook(42, { alias: '', page: 2 })
      ).toEqual({ ok: false, status: 401, code: 'SESSION_CHANGED' })
      expect(seen).toEqual([])
    }
  )

  it('searches by alias on the canonical list', async () => {
    const result = await listExploreCreatorsForHook(null, {
      alias: ' da ',
      page: 1,
    })

    expect(seen[0]).toMatchObject({
      path: '/api/landing/creators',
      search: '?alias=da&page=1',
    })
    expect(result).toMatchObject({
      ok: true,
      data: { items: [{ alias: 'dana', followerCount: null }], nextPage: null },
    })
  })

  it.each([
    [{ alias: '', page: 0 }, null],
    [{ alias: 'x'.repeat(256), page: 1 }, null],
    [{ alias: '', page: 1 }, -1],
  ])(
    'rejects invalid input %j for viewer %j without calling the API',
    async (input, viewer) => {
      expect(await listExploreCreatorsForHook(viewer, input)).toEqual({
        ok: false,
        status: 400,
        code: 'INVALID_REQUEST',
      })
      expect(seen).toEqual([])
    }
  )

  it.each([['javascript:alert(1)'], ['avatars/42/a.png']])(
    'drops a non-http image URL (%s) instead of failing the page',
    async (avatar) => {
      topReturns([{ ...creator, avatar }])

      expect(
        await listExploreCreatorsForHook(null, { alias: '', page: 1 })
      ).toMatchObject({
        ok: true,
        data: { items: [{ id: 4, avatarUrl: null }] },
      })
    }
  )

  it.each([
    ['a non-numeric follower count', { ...creator, numFollowers: 'many' }],
    ['a missing id', { ...creator, id: undefined }],
  ])('refuses a response with %s', async (_name, item) => {
    topReturns([item])

    expect(
      await listExploreCreatorsForHook(null, { alias: '', page: 1 })
    ).toEqual({ ok: false, code: 'INVALID_EXPLORE_RESPONSE' })
  })

  it('passes an API failure through as a status', async () => {
    server.use(
      http.get(`${apiOrigin}/landing/creators/top`, () =>
        HttpResponse.json(
          { data: null, errors: { message: 'boom', code: 'X' } },
          { status: 500 }
        )
      )
    )

    expect(
      await listExploreCreatorsForHook(null, { alias: '', page: 1 })
    ).toMatchObject({ ok: false, status: 500 })
  })
})
