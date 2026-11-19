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
const { createTierForHook, listTiersForHook, uploadTierCoverForHook } =
  await import('./actions')
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
          displayName: 'Sara',
          hasPassword: true,
        },
        errors: null,
      })
    ),
    http.get(`${apiOrigin}/tire`, ({ request: upstream }) => {
      tierCalls++
      expect(upstream.headers.get('authorization')).toBe(`Bearer ${token()}`)
      return HttpResponse.json({
        data: [
          {
            id: 7,
            creatorId: 42,
            title: 'Supporter',
            description: null,
            price: 150000,
            hasStop: false,
            chatEnabled: false,
            cover: null,
            advanced: [],
            benefits: [],
            createdAt: '2026-11-19T08:00:00.000Z',
            updatedAt: '2026-11-19T08:00:00.000Z',
          },
        ],
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
          priceToman: 150000,
          chatEnabled: false,
          capacity: null,
          coverId: null,
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

  it('rejects titles over the backend limits before writing', async () => {
    const long = { title: 'x'.repeat(121), price: 150000 }
    expect(await createTierForHook(42, long)).toMatchObject({
      ok: false,
      status: 400,
    })
    const benefit = {
      title: 'Gold',
      price: 150000,
      benefits: [{ title: 'y'.repeat(161), roleId: 1 }],
    }
    expect(await createTierForHook(42, benefit)).toMatchObject({
      ok: false,
      status: 400,
    })
    expect(tierCalls).toBe(0)
  })

  it("checks a cover's type and size before uploading it", async () => {
    let uploads = 0
    server.use(
      http.post(`${apiOrigin}/tire/cover`, () => {
        uploads++
        return HttpResponse.json({
          data: {
            id: '1712345678-abcdef012345.png',
            url: 'https://cdn.example/c.png',
          },
          errors: null,
        })
      })
    )
    const form = (file: File) => {
      const body = new FormData()
      body.append('image', file)
      return body
    }
    const svg = new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' })
    const huge = new File([new Uint8Array(1024 * 1024)], 'a.png', {
      type: 'image/png',
    })
    const png = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })
    expect(await uploadTierCoverForHook(42, form(svg))).toMatchObject({
      ok: false,
      status: 400,
    })
    expect(await uploadTierCoverForHook(42, form(huge))).toMatchObject({
      ok: false,
      status: 400,
    })
    expect(uploads).toBe(0)
    expect(await uploadTierCoverForHook(42, form(png))).toEqual({
      ok: true,
      data: {
        id: '1712345678-abcdef012345.png',
        url: 'https://cdn.example/c.png',
      },
    })
    expect(uploads).toBe(1)
  })
})
