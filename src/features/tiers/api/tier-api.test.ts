import { HttpResponse, http } from 'msw'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { server } from '../../../../test/msw/server'

const origin = 'https://api.fellowa.test'
vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', `${origin}/api`)
const { apiClient } = await import('@/lib/api/client')
const {
  TIER_COVER_UPLOAD_TIMEOUT_MS,
  createTier,
  deleteTier,
  listOwnTiers,
  listTierRoles,
  updateTier,
  uploadTierCover,
} = await import('./tier-api')
afterAll(() => vi.unstubAllEnvs())

const coverId = '1712345678-abcdef012345.webp'

/** `TierService.listTires` on back-end develop (b56f6a1). */
function listRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    creatorId: 4,
    title: 'Supporter',
    description: null,
    price: 150000,
    hasStop: false,
    chatEnabled: true,
    cover: {
      id: coverId,
      url: `https://cdn.example/${coverId}`,
      tireId: 7,
      image: `patreon/file/tires/cover/3/${coverId}`,
    },
    advanced: [{ tireId: 7, limitedUser: true, limitNumberUser: 25 }],
    benefits: [
      {
        id: 2,
        title: 'Special posts',
        roleId: 1,
        role: { id: 1, title: 'Post', persianTitle: 'پست', description: null },
        tireId: 7,
      },
    ],
    seatsTaken: 4,
    createdAt: '2026-11-19T08:00:00.000Z',
    updatedAt: '2026-11-19T08:00:00.000Z',
    ...overrides,
  }
}

describe('tier API contract', () => {
  it('reads creator tiers and roles from guarded GET routes', async () => {
    server.use(
      http.get(`${origin}/api/tire`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe(
          'Bearer creator-token'
        )
        return HttpResponse.json({ data: [listRow()], errors: null })
      }),
      http.get(`${origin}/api/tire/role`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe(
          'Bearer creator-token'
        )
        return HttpResponse.json({
          data: [
            { id: 1, title: 'Post', persianTitle: 'پست', description: null },
          ],
          errors: null,
        })
      })
    )
    await expect(listOwnTiers('creator-token')).resolves.toEqual([
      {
        id: 7,
        title: 'Supporter',
        description: '',
        priceToman: 150000,
        chatEnabled: true,
        capacity: 25,
        cover: { id: coverId, url: `https://cdn.example/${coverId}` },
        benefits: [{ id: 2, title: 'Special posts', roleId: 1 }],
        seatsTaken: 4,
      },
    ])
    await expect(listTierRoles('creator-token')).resolves.toEqual([
      { id: 1, title: 'Post', persianTitle: 'پست' },
    ])
  })

  it('reads custom benefits (roleId and role null) and rows without a custom title', async () => {
    server.use(
      http.get(`${origin}/api/tire`, () =>
        HttpResponse.json({
          data: [
            listRow({
              cover: null,
              advanced: [],
              chatEnabled: false,
              benefits: [
                { id: 3, title: 'Custom', roleId: null, role: null, tireId: 7 },
                { id: 4, title: null, roleId: 2, role: null, tireId: 7 },
              ],
            }),
          ],
          errors: null,
        })
      )
    )
    const [tier] = await listOwnTiers('creator-token')
    expect(tier).toMatchObject({ cover: null, capacity: null })
    expect(tier?.benefits).toEqual([
      { id: 3, title: 'Custom', roleId: null },
      { id: 4, title: '', roleId: 2 },
    ])
  })

  it('rejects a list cover without its url (BE-TIER-07 contract)', async () => {
    server.use(
      http.get(`${origin}/api/tire`, () =>
        HttpResponse.json({
          data: [
            listRow({
              cover: {
                id: coverId,
                tireId: 7,
                image: `patreon/file/tires/cover/3/${coverId}`,
              },
            }),
          ],
          errors: null,
        })
      )
    )
    await expect(listOwnTiers('creator-token')).rejects.toMatchObject({
      name: 'InvalidTierResponseError',
    })
  })

  it('uploads a cover as multipart field `image`', async () => {
    server.use(
      http.post(`${origin}/api/tire/cover`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBe(
          'Bearer creator-token'
        )
        const form = await request.formData()
        const image = form.get('image')
        // jsdom and undici each have a File class: compare the shape.
        expect(image).toMatchObject({ type: 'image/png', size: 3 })
        return HttpResponse.json({
          data: { id: coverId, url: `https://cdn.example/${coverId}` },
          errors: null,
        })
      })
    )
    const file = new File([new Uint8Array([1, 2, 3])], 'cover.png', {
      type: 'image/png',
    })
    await expect(uploadTierCover('creator-token', file)).resolves.toEqual({
      id: coverId,
      url: `https://cdn.example/${coverId}`,
    })
  })

  it('gives the cover upload alone a 60 s timeout; other calls keep the 20 s default', async () => {
    server.use(
      http.post(`${origin}/api/tire/cover`, () =>
        HttpResponse.json({
          data: { id: coverId, url: `https://cdn.example/${coverId}` },
          errors: null,
        })
      ),
      http.get(`${origin}/api/tire`, () =>
        HttpResponse.json({ data: [], errors: null })
      )
    )
    const timeouts: Array<number | undefined> = []
    const recorder = apiClient.interceptors.request.use((config) => {
      timeouts.push(config.timeout)
      return config
    })
    try {
      const file = new File([new Uint8Array([1])], 'cover.png', {
        type: 'image/png',
      })
      await uploadTierCover('creator-token', file)
      await listOwnTiers('creator-token')
    } finally {
      apiClient.interceptors.request.eject(recorder)
    }
    expect(TIER_COVER_UPLOAD_TIMEOUT_MS).toBe(60_000)
    expect(timeouts).toEqual([60_000, 20_000])
  })

  it('keeps a cover whose url is a bare storage key, without the url (FE-TIER-04)', async () => {
    const key = `patreon/file/tires/cover/3/${coverId}`
    server.use(
      http.get(`${origin}/api/tire`, () =>
        HttpResponse.json({
          data: [
            listRow({
              cover: { id: coverId, url: key, tireId: 7, image: key },
            }),
          ],
          errors: null,
        })
      ),
      http.post(`${origin}/api/tire/cover`, () =>
        HttpResponse.json({ data: { id: coverId, url: key }, errors: null })
      )
    )
    const [tier] = await listOwnTiers('creator-token')
    expect(tier?.cover).toEqual({ id: coverId, url: null })
    const file = new File([new Uint8Array([1])], 'cover.png', {
      type: 'image/png',
    })
    await expect(uploadTierCover('creator-token', file)).resolves.toEqual({
      id: coverId,
      url: null,
    })
  })

  it('sends DTO bodies for create and update, and deletes by archiving', async () => {
    const payload = {
      title: 'Gold',
      description: 'Good',
      price: 150000,
      chatEnabled: true,
      tireAdvanced: { limitedUser: true, limitNumberUser: 10 },
      benefits: [{ title: 'Posts', roleId: 1 }],
    }
    server.use(
      http.post(`${origin}/api/tire`, async ({ request }) => {
        expect(await request.json()).toEqual({
          ...payload,
          coverTireId: coverId,
        })
        return HttpResponse.json({ data: { id: 12 }, errors: null })
      }),
      http.put(`${origin}/api/tire/12`, async ({ request }) => {
        expect(await request.json()).toEqual({ ...payload, coverTireId: null })
        return HttpResponse.json({ data: { id: 12 }, errors: null })
      }),
      http.delete(`${origin}/api/tire/12`, () =>
        HttpResponse.json({ data: { message: 'Tier deleted' }, errors: null })
      )
    )
    await expect(
      createTier('creator-token', { ...payload, coverTireId: coverId })
    ).resolves.toBe(12)
    await expect(
      updateTier('creator-token', 12, { ...payload, coverTireId: null })
    ).resolves.toBe(12)
    await expect(deleteTier('creator-token', 12)).resolves.toBeUndefined()
  })

  it('surfaces 400 USER_ALIAS_REQUIRED with its code', async () => {
    server.use(
      http.post(`${origin}/api/tire`, () =>
        HttpResponse.json(
          {
            data: null,
            errors: [
              {
                message: 'Set an alias before setting up your page',
                code: 'USER_ALIAS_REQUIRED',
              },
            ],
          },
          { status: 400 }
        )
      )
    )
    await expect(
      createTier('creator-token', { title: 'Gold', price: 150000 })
    ).rejects.toMatchObject({ status: 400, code: 'USER_ALIAS_REQUIRED' })
  })

  it.each(['50000.50', '9007199254740992', '-1', 'NaN'])(
    'rejects unsafe price %s',
    async (price) => {
      server.use(
        http.get(`${origin}/api/tire`, () =>
          HttpResponse.json({ data: [listRow({ price })], errors: null })
        )
      )
      await expect(listOwnTiers('creator-token')).rejects.toMatchObject({
        name: 'InvalidTierResponseError',
      })
    }
  )

  it('rejects a tier list that omits its benefits relation before an edit could erase it', async () => {
    const row: Record<string, unknown> = listRow()
    delete row.benefits
    server.use(
      http.get(`${origin}/api/tire`, () =>
        HttpResponse.json({ data: [row], errors: null })
      )
    )
    await expect(listOwnTiers('creator-token')).rejects.toMatchObject({
      name: 'InvalidTierResponseError',
    })
  })

  it('surfaces 400 TIER_PRICE_BELOW_MINIMUM with its code', async () => {
    server.use(
      http.put(`${origin}/api/tire/12`, () =>
        HttpResponse.json(
          {
            data: null,
            errors: [
              {
                message: 'Tier price must be at least 100000 Toman',
                code: 'TIER_PRICE_BELOW_MINIMUM',
              },
            ],
          },
          { status: 400 }
        )
      )
    )
    await expect(
      updateTier('creator-token', 12, { title: 'Gold', price: 99999 })
    ).rejects.toMatchObject({ status: 400, code: 'TIER_PRICE_BELOW_MINIMUM' })
  })

  it('rejects a list item without seatsTaken (owner contract, BE-TIER-06)', async () => {
    const row: Record<string, unknown> = listRow()
    delete row.seatsTaken
    server.use(
      http.get(`${origin}/api/tire`, () =>
        HttpResponse.json({ data: [row], errors: null })
      )
    )
    await expect(listOwnTiers('creator-token')).rejects.toMatchObject({
      name: 'InvalidTierResponseError',
    })
  })
})
