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
vi.mock('@/features/auth/server/session', () => ({ getSession: api.session }))
vi.mock('@/features/explore/server', () => ({
  loadExploreCategories: api.categories,
}))

const { loadCreatorPage } = await import('./load-creator-page')

const profile = { id: 4, alias: 'dana', categoryId: 2 }
const notFound = () => new ApiError({ message: 'Not found', status: 404 })

beforeEach(() => {
  api.profile.mockResolvedValue(profile)
  api.tiers.mockResolvedValue([])
  api.posts.mockResolvedValue([])
  api.session.mockResolvedValue(null)
  api.categories.mockResolvedValue([{ id: 2, title: 'Music' }])
})

describe('loadCreatorPage (FE-PAGE-01)', () => {
  it('reads everything for a canonical id and names the category', async () => {
    expect(await loadCreatorPage('4')).toMatchObject({
      profile,
      tiers: [],
      posts: [],
      categoryTitle: 'Music',
      viewer: 'anonymous',
    })
    expect(api.profile).toHaveBeenCalledWith(4)
  })

  it.each([
    [null, 'anonymous'],
    [{ user: { id: 7 } }, 'signedIn'],
    [{ user: { id: 4 } }, 'owner'],
  ])('a session of %j is the %s viewer', async (session, viewer) => {
    api.session.mockResolvedValue(session)

    expect(await loadCreatorPage('4')).toMatchObject({ viewer })
  })

  it('treats an unverifiable session as anonymous', async () => {
    api.session.mockRejectedValue(new Error('network'))

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
