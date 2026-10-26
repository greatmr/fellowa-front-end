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
const { createTierForHook, listTiersForHook } = await import('./actions')
afterAll(() => vi.unstubAllEnvs())

function token(userId = 42) {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })
  ).toString('base64url')
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.backendSignature`
}

let tierCalls = 0
beforeEach(() => {
  request.origin = 'https://fellowa.test'
  request.cookie = token()
  tierCalls = 0
  server.use(
    http.get(`${apiOrigin}/user/42/profile`, () =>
      HttpResponse.json({
        data: {
          id: 42,
          email: 'creator@example.com',
          alias: null,
          isVerified: true,
        },
        errors: null,
      })
    ),
    http.get(`${apiOrigin}/tire`, ({ request: upstream }) => {
      tierCalls++
      expect(upstream.headers.get('authorization')).toBe(`Bearer ${token()}`)
      return HttpResponse.json({
        data: [{ id: 7, title: 'Supporter', price: '50000', benefits: [] }],
        errors: null,
      })
    }),
    http.post(`${apiOrigin}/tire`, async ({ request: upstream }) => {
      tierCalls++
      expect(upstream.headers.get('authorization')).toBe(`Bearer ${token()}`)
      expect(await upstream.json()).toEqual({
        title: 'Gold',
        price: 50000,
        benefits: [],
      })
      return HttpResponse.json({ data: { id: 8 }, errors: null })
    })
  )
})

describe('tier hook server boundary', () => {
  it('returns only normalized tier data and verifies the viewer id', async () => {
    expect(await listTiersForHook(42)).toEqual({
      ok: true,
      data: [
        {
          id: 7,
          title: 'Supporter',
          description: '',
          priceToman: 50000,
          benefits: [],
        },
      ],
    })
    expect(JSON.stringify(await listTiersForHook(42))).not.toContain(token())
    expect(await listTiersForHook(9)).toMatchObject({ ok: false, status: 403 })
    expect(tierCalls).toBe(2)
  })

  it('checks mutation Origin and DTO before writing', async () => {
    const payload = { title: 'Gold', price: 50000, benefits: [] }
    request.origin = 'https://attacker.example'
    expect(await createTierForHook(42, payload)).toMatchObject({
      ok: false,
      status: 403,
    })
    request.origin = 'https://fellowa.test'
    expect(await createTierForHook(42, { ...payload, price: 0 })).toMatchObject(
      { ok: false, status: 400 }
    )
    expect(await createTierForHook(9, payload)).toMatchObject({
      ok: false,
      status: 403,
    })
    expect(tierCalls).toBe(0)
    expect(await createTierForHook(42, payload)).toEqual({ ok: true, data: 8 })
    expect(tierCalls).toBe(1)
  })
})
