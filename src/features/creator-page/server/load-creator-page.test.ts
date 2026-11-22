import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api/errors'

// The request functions and session are replaced; their own parsing and the
// HTTP boundary are covered by schemas/creator-page.test.ts and the session
// tests. This pins what the loader decides: id, 404s, viewer, degradation.
const api = vi.hoisted(() => ({
  profile: vi.fn(),
  tiers: vi.fn(),
  posts: vi.fn(),
  collections: vi.fn(),
  session: vi.fn(),
  categories: vi.fn(),
}))
vi.mock('server-only', () => ({}))
vi.mock('@/features/creator-page/api/creator-page-api', () => ({
  getCreatorProfile: api.profile,
  getCreatorTiers: api.tiers,
  getCreatorPostPage: api.posts,
  getCreatorCollections: api.collections,
}))
vi.mock('@/features/auth/server', () => ({
  readOptionalSessionToken: api.session,
}))
vi.mock('@/features/explore/server', () => ({
  loadExploreCategories: api.categories,
}))

vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.fellowa.test/api')
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fellowa.test/')
const { loadCreatorPage } = await import('./load-creator-page')
afterAll(() => vi.unstubAllEnvs())

const firstPage = { items: [], total: 0, nextPage: null }

const profile = { id: 4, alias: 'dana', categoryId: 2, viewerFollows: null }
const notFound = () => new ApiError({ message: 'Not found', status: 404 })

beforeEach(() => {
  api.profile.mockResolvedValue(profile)
  api.tiers.mockResolvedValue([])
  api.posts.mockResolvedValue(firstPage)
  api.collections.mockResolvedValue([])
  api.session.mockResolvedValue(null)
  api.categories.mockResolvedValue([{ id: 2, title: 'Music' }])
})

describe('loadCreatorPage (FE-PAGE-01/02/03)', () => {
  it('reads everything for a canonical id and names the category', async () => {
    expect(await loadCreatorPage('4')).toMatchObject({
      profile,
      tiers: [],
      posts: firstPage,
      collections: [],
      categoryTitle: 'Music',
      viewer: 'anonymous',
      pageUrl: 'https://fellowa.test/creators/4',
    })
    expect(api.profile).toHaveBeenCalledWith(4, undefined)
    // The first page of the public list, read with no token (Q-51).
    expect(api.posts).toHaveBeenCalledWith(4, 1)
  })

  it("sends the cookie's token with the profile read", async () => {
    api.session.mockResolvedValue({ token: 't0ken', userId: 7 })
    api.profile.mockResolvedValue({ ...profile, viewerFollows: false })

    await loadCreatorPage('4')

    expect(api.profile).toHaveBeenCalledWith(4, 't0ken')
  })

  it.each([
    ['no cookie', null, null, 'anonymous'],
    [
      'a cookie the backend rejected',
      { token: 't', userId: 7 },
      null,
      'anonymous',
    ],
    ['another account', { token: 't', userId: 7 }, false, 'signedIn'],
    ['the owner', { token: 't', userId: 4 }, false, 'owner'],
  ])(
    'with %s the viewer is %s',
    async (_name, session, viewerFollows, viewer) => {
      api.session.mockResolvedValue(session)
      api.profile.mockResolvedValue({ ...profile, viewerFollows })

      expect(await loadCreatorPage('4')).toMatchObject({ viewer })
    }
  )

  it('treats an unreadable cookie as anonymous', async () => {
    api.session.mockRejectedValue(new Error('cookies unavailable'))

    expect(await loadCreatorPage('4')).toMatchObject({ viewer: 'anonymous' })
  })

  it.each(['0', '012', '0x10', '1e1', ' 12', '-4', '2147483648', 'abc'])(
    'is not found for the non-canonical id %j, without calling the API',
    async (raw) => {
      expect(await loadCreatorPage(raw)).toBeNull()
      expect(api.profile).not.toHaveBeenCalled()
    }
  )

  it.each([
    ['profile', () => api.profile.mockRejectedValue(notFound())],
    ['posts', () => api.posts.mockRejectedValue(notFound())],
    ['tiers', () => api.tiers.mockRejectedValue(notFound())],
  ])('is not found when the %s read is a 404', async (_name, arrange) => {
    arrange()

    expect(await loadCreatorPage('4')).toBeNull()
  })

  it('degrades only the tiers when they cannot be read', async () => {
    api.tiers.mockRejectedValue(new Error('invalid price'))

    expect(await loadCreatorPage('4')).toMatchObject({ profile, tiers: null })
  })

  it('degrades only the posts when they cannot be read', async () => {
    api.posts.mockRejectedValue(new ApiError({ message: 'boom', status: 500 }))

    expect(await loadCreatorPage('4')).toMatchObject({ profile, posts: null })
  })

  it('lets any other failure reach the error boundary', async () => {
    api.profile.mockRejectedValue(
      new ApiError({ message: 'boom', status: 500 })
    )

    await expect(loadCreatorPage('4')).rejects.toMatchObject({ status: 500 })
  })

  it.each([
    ['a 404', () => new ApiError({ message: 'x', status: 404 })],
    ['a 500', () => new ApiError({ message: 'x', status: 500 })],
  ])(
    'hides only the collections when they cannot be read (%s)',
    async (_, error) => {
      api.collections.mockRejectedValue(error())
      expect(await loadCreatorPage('4')).toMatchObject({
        profile,
        collections: null,
        posts: firstPage,
      })
    }
  )
})
