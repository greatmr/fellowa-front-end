import { HttpResponse, http } from 'msw'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { server } from '../../../../test/msw/server'

const origin = 'https://api.fellowa.test'
vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', `${origin}/api`)
const { createTier, deleteTier, listOwnTiers, listTierRoles, updateTier } =
  await import('./tier-api')
afterAll(() => vi.unstubAllEnvs())

describe('tier API contract', () => {
  it('reads creator tiers and roles from guarded GET routes, normalizing decimal prices', async () => {
    server.use(
      http.get(`${origin}/api/tire`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe(
          'Bearer creator-token'
        )
        return HttpResponse.json({
          data: [
            {
              id: 7,
              creatorId: 4,
              title: 'Supporter',
              description: null,
              price: '50000.00',
              benefits: [
                { id: 2, title: 'Special posts', roleId: 1, role: { id: 1 } },
              ],
              privateField: 'do not expose',
            },
          ],
          errors: null,
        })
      }),
      http.get(`${origin}/api/tire/role`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe(
          'Bearer creator-token'
        )
        return HttpResponse.json({
          data: [{ id: 1, title: 'Post', persianTitle: 'پست', extra: true }],
          errors: null,
        })
      })
    )
    await expect(listOwnTiers('creator-token')).resolves.toEqual([
      {
        id: 7,
        title: 'Supporter',
        description: '',
        priceToman: 50000,
        benefits: [{ id: 2, title: 'Special posts', roleId: 1 }],
      },
    ])
    await expect(listTierRoles('creator-token')).resolves.toEqual([
      { id: 1, title: 'Post', persianTitle: 'پست' },
    ])
  })

  it('uses backend DTO bodies for create and update, and soft-delete endpoint', async () => {
    const payload = {
      title: 'Gold',
      description: 'Good',
      price: 50000,
      benefits: [{ title: 'Posts', roleId: 1 }],
    }
    server.use(
      http.post(`${origin}/api/tire`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBe(
          'Bearer creator-token'
        )
        expect(await request.json()).toEqual(payload)
        return HttpResponse.json({ data: { id: 12 }, errors: null })
      }),
      http.put(`${origin}/api/tire/12`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBe(
          'Bearer creator-token'
        )
        expect(await request.json()).toEqual(payload)
        return HttpResponse.json({ data: { id: 12 }, errors: null })
      }),
      http.delete(`${origin}/api/tire/12`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe(
          'Bearer creator-token'
        )
        return HttpResponse.json({
          data: { message: 'Tier deleted' },
          errors: null,
        })
      })
    )
    await expect(createTier('creator-token', payload)).resolves.toBe(12)
    await expect(updateTier('creator-token', 12, payload)).resolves.toBe(12)
    await expect(deleteTier('creator-token', 12)).resolves.toBeUndefined()
  })

  it.each(['50000.50', '9007199254740992', '-1', 'NaN'])(
    'rejects unsafe price %s',
    async (price) => {
      server.use(
        http.get(`${origin}/api/tire`, () =>
          HttpResponse.json({
            data: [{ id: 1, title: 'Bad', price }],
            errors: null,
          })
        )
      )
      await expect(listOwnTiers('creator-token')).rejects.toMatchObject({
        name: 'InvalidTierResponseError',
      })
    }
  )

  it('rejects a tier list that omits its benefits relation before an edit could erase it', async () => {
    server.use(
      http.get(`${origin}/api/tire`, () =>
        HttpResponse.json({
          data: [{ id: 1, title: 'Bad', price: 50000 }],
          errors: null,
        })
      )
    )
    await expect(listOwnTiers('creator-token')).rejects.toMatchObject({
      name: 'InvalidTierResponseError',
    })
  })
})
