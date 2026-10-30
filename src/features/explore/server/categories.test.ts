import { HttpResponse, http } from 'msw'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { server } from '../../../../test/msw/server'

const apiOrigin = 'https://api.fellowa.test/api'
vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', apiOrigin)
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fellowa.test')
const { loadExploreCategories } = await import('./categories')
afterAll(() => vi.unstubAllEnvs())

describe('explore categories (BE-LAND-07)', () => {
  it('loads the public list without a token, keeping only id and title', async () => {
    let auth: string | null = 'unset'
    server.use(
      http.get(`${apiOrigin}/landing/categories`, ({ request }) => {
        auth = request.headers.get('authorization')
        return HttpResponse.json({
          data: [{ id: 2, title: 'Music', extra: 'dropped' }],
          errors: null,
        })
      })
    )

    expect(await loadExploreCategories()).toEqual([{ id: 2, title: 'Music' }])
    expect(auth).toBeNull()
  })

  it.each([
    ['an API error', () => HttpResponse.json({}, { status: 500 })],
    [
      'a malformed body',
      () => HttpResponse.json({ data: [{ id: 'x' }], errors: null }),
    ],
  ])(
    'returns no categories on %s, so explore renders without chips',
    async (_n, reply) => {
      server.use(http.get(`${apiOrigin}/landing/categories`, reply))

      expect(await loadExploreCategories()).toEqual([])
    }
  )
})
