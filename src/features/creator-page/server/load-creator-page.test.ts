import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api/errors'

// The request functions and session are replaced; their own parsing and the
// HTTP boundary are covered by schemas/creator-page.test.ts and the session
// tests. This pins what the loader decides: id, 404s, viewer, degradation.
const api = vi.hoisted(() => ({
  profile: vi.fn(),
  tiers: vi.fn(),
  posts: vi.fn(),
  session: vi.fn(),
  categories: vi.fn(),
}))
vi.mock('server-only', () => ({}))
vi.mock('@/features/creator-page/api/creator-page-api', () => ({
  getCreatorProfile: api.profile,
  getCreatorTiers: api.tiers,
  getCreatorPosts: api.posts,
}))
vi.mock('@/features/auth/server', () => ({
  readOptionalSessionToken: api.session,
}))
vi.mock('@/features/explore/server', () => ({
  loadExploreCategories: api.categories,
}))

const { loadCreatorPage } = await import('./load-creator-page')

const profile = { id: 4, alias: 'dana', categoryId: 2, viewerFollows: null }
const notFound = () => new ApiError({ message: 'Not found', status: 404 })

beforeEach(() => {
  api.profile.mockResolvedValue(profile)
  api.tiers.mockResolvedValue([])
  api.posts.mockResolvedValue([])
  api.session.mockResolvedValue(null)
  api.categories.mockResolvedValue([{ id: 2, title: 'Music' }])
})

describe('loadCreatorPage (FE-PAGE-01/02)', () => {
  it('reads everything for a canonical id and names the category', async () => {
    expect(await loadCreatorPage('4')).toMatchObject({
      profile,
      tiers: [],
      posts: [],
      categoryTitle: 'Music',
      viewer: 'anonymous',
    })
    expect(api.profile).toHaveBeenCalledWith(4, undefined)
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

  it('lets any other failure reach the error boundary', async () => {
    api.profile.mockRejectedValue(
      new ApiError({ message: 'boom', status: 500 })
    )

    await expect(loadCreatorPage('4')).rejects.toMatchObject({ status: 500 })
  })
})
