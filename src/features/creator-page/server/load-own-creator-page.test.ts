import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api/errors'

// The request functions and session are replaced; the parsing and the HTTP
// boundary are covered by schemas/creator-page.test.ts and actions.test.ts.
// This pins what the loader decides: the token, the me/page routes, the
// outcomes and degradation.
const api = vi.hoisted(() => ({
  page: vi.fn(),
  tiers: vi.fn(),
  posts: vi.fn(),
  collections: vi.fn(),
  session: vi.fn(),
  categories: vi.fn(),
  publicProfile: vi.fn(),
}))
vi.mock('server-only', () => ({}))
vi.mock('@/features/creator-page/api/creator-page-api', () => ({
  getOwnCreatorPage: api.page,
  getOwnCreatorTiers: api.tiers,
  getOwnCreatorPostPage: api.posts,
  getOwnCreatorCollections: api.collections,
  getCreatorProfile: api.publicProfile,
}))
vi.mock('@/features/auth/server', () => ({ getSession: api.session }))
vi.mock('@/features/explore/server', () => ({
  loadExploreCategories: api.categories,
}))

vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.fellowa.test/api')
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fellowa.test')
const { loadOwnCreatorPage } = await import('./load-own-creator-page')
afterAll(() => vi.unstubAllEnvs())

const firstPage = { items: [], total: 0, nextPage: null }
const profile = { id: 4, alias: 'dana', categoryId: 2, viewerFollows: null }
const session = {
  token: 't0ken',
  user: { id: 4, alias: 'dana', isVerified: true },
}
const failure = (status: number, code?: string) =>
  new ApiError({ message: code ?? 'failed', status, code })

beforeEach(() => {
  vi.clearAllMocks()
  api.session.mockResolvedValue(session)
  api.page.mockResolvedValue({ profile, isPublished: false })
  api.tiers.mockResolvedValue([])
  api.posts.mockResolvedValue(firstPage)
  api.collections.mockResolvedValue([])
  api.categories.mockResolvedValue([{ id: 2, title: 'Music' }])
})

describe('loadOwnCreatorPage (BE-LAND-10)', () => {
  it("reads the owner's page from the me/page routes with the session token", async () => {
    expect(await loadOwnCreatorPage()).toEqual({
      kind: 'page',
      data: {
        profile,
        tiers: [],
        posts: firstPage,
        collections: [],
        categoryTitle: 'Music',
        pageUrl: 'https://fellowa.test/creators/4',
        viewer: 'owner',
        ownPage: { isPublished: false },
      },
    })
    expect(api.page).toHaveBeenCalledWith('t0ken')
    expect(api.tiers).toHaveBeenCalledWith('t0ken')
    expect(api.posts).toHaveBeenCalledWith('t0ken', 4, 1)
    expect(api.collections).toHaveBeenCalledWith('t0ken')
    // Never the public routes.
    expect(api.publicProfile).not.toHaveBeenCalled()
  })

  it('carries a published page', async () => {
    api.page.mockResolvedValue({ profile, isPublished: true })
    expect(await loadOwnCreatorPage()).toMatchObject({
      data: { ownPage: { isPublished: true } },
    })
  })

  it('is signed out without a session, reading nothing', async () => {
    api.session.mockResolvedValue(null)
    expect(await loadOwnCreatorPage()).toEqual({ kind: 'signedOut' })
    expect(api.page).not.toHaveBeenCalled()
  })

  it('sends an unverified account to its own gate', async () => {
    api.session.mockResolvedValue({
      ...session,
      user: { ...session.user, isVerified: false },
    })
    expect(await loadOwnCreatorPage()).toEqual({ kind: 'unverified' })
  })

  it('is signed out when the backend refuses the token (401)', async () => {
    api.page.mockRejectedValue(failure(401))
    expect(await loadOwnCreatorPage()).toEqual({ kind: 'signedOut' })
  })

  it('has no page on 400 USER_ALIAS_REQUIRED', async () => {
    const noAlias = failure(400, 'USER_ALIAS_REQUIRED')
    api.page.mockRejectedValue(noAlias)
    api.tiers.mockRejectedValue(noAlias)
    api.posts.mockRejectedValue(noAlias)
    api.collections.mockRejectedValue(noAlias)
    expect(await loadOwnCreatorPage()).toEqual({ kind: 'noPage' })
  })

  it('lets tiers, posts and collections degrade alone', async () => {
    api.tiers.mockRejectedValue(failure(500))
    api.posts.mockRejectedValue(failure(500))
    api.collections.mockRejectedValue(failure(500))
    expect(await loadOwnCreatorPage()).toMatchObject({
      kind: 'page',
      data: { tiers: null, posts: null, collections: null },
    })
  })

  it('throws any other profile failure to the error boundary', async () => {
    api.page.mockRejectedValue(failure(500))
    await expect(loadOwnCreatorPage()).rejects.toMatchObject({ status: 500 })
  })

  it("refuses a page that is not the session's own", async () => {
    api.page.mockResolvedValue({
      profile: { ...profile, id: 5 },
      isPublished: true,
    })
    await expect(loadOwnCreatorPage()).rejects.toThrow(
      'Invalid creator page response'
    )
  })
})
