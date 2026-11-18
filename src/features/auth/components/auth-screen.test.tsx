import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthUser } from '@/features/auth/types'

/**
 * The sign-up step screens are async server components: they read the
 * session and either redirect or render the step's form. They are called
 * directly here (jsdom cannot render a server component), with the session
 * read and `redirect` replaced; what they return is the form element.
 */
const mocked = vi.hoisted(() => {
  class Redirected extends Error {
    constructor(readonly target: unknown) {
      super('redirect')
    }
  }
  return { session: null as unknown, Redirected }
})
vi.mock('@/features/auth/server/session', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSession: async () => mocked.session,
}))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  redirect: (target: unknown) => {
    throw new mocked.Redirected(target)
  },
}))

vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.fellowa.test/api')
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fellowa.test')
const { InterestsScreen, PageAddressScreen, PageCategoryScreen } =
  await import('./auth-screen')
const { InterestsForm } = await import('./interests-form')
const { PageAddressForm } = await import('./page-address-form')
const { PageCategoryForm } = await import('./page-category-form')
afterAll(() => vi.unstubAllEnvs())

/** The owner profile the session read: a creator with a page by default. */
function signIn(user: Partial<AuthUser> = {}) {
  mocked.session = {
    token: 'token',
    expiresAt: new Date(Date.now() + 3_600_000),
    user: {
      id: 42,
      email: null,
      alias: 'sara_art',
      isVerified: true,
      displayName: 'Sara',
      hasPassword: false,
      categoryId: 7,
      ...user,
    } satisfies AuthUser,
  }
}

const props = (query: Record<string, string> = {}) => ({
  locale: 'en' as const,
  searchParams: Promise.resolve(query),
})

async function redirectOf(screen: Promise<unknown>) {
  try {
    await screen
  } catch (error) {
    if (error instanceof mocked.Redirected) return error.target
    throw error
  }
  throw new Error('rendered instead of redirecting')
}

const to = (href: unknown) => ({ href, locale: 'en' })

beforeEach(() => {
  mocked.session = null
})

describe('PageAddressScreen (/auth/url)', () => {
  it.each([
    [{}, '/auth'],
    [
      { returnTo: '/settings' },
      { pathname: '/auth', query: { returnTo: '/settings' } },
    ],
  ])('signed out with %j, sends the account to %j', async (query, href) => {
    expect(await redirectOf(PageAddressScreen(props(query)))).toEqual(to(href))
  })

  it('sends an unverified account to verify its email', async () => {
    signIn({ isVerified: false })
    expect(await redirectOf(PageAddressScreen(props()))).toEqual(
      to('/auth/verify-email')
    )
  })

  it('in sign-up, with no page yet, shows step 2 going on to the interests', async () => {
    signIn({ alias: null })
    const element = await PageAddressScreen(props())
    expect(element.type).toBe(PageAddressForm)
    expect(element.props).toMatchObject({
      destination: '/auth/interests',
      returnTo: undefined,
      currentAddress: null,
      backFromInterests: false,
    })
  })

  it('on a plain visit, sends an account that has a page on to the studio', async () => {
    signIn()
    expect(await redirectOf(PageAddressScreen(props()))).toEqual(to('/studio'))
  })

  it.each([{ from: 'elsewhere' }, { from: '' }])(
    'does not take %j for a return from the interests step',
    async (query) => {
      signIn()
      expect(await redirectOf(PageAddressScreen(props(query)))).toEqual(
        to('/studio')
      )
    }
  )

  it('back from the interests step, shows the page address to keep or change', async () => {
    signIn()
    const element = await PageAddressScreen(props({ from: 'interests' }))
    expect(element.type).toBe(PageAddressForm)
    expect(element.props).toMatchObject({
      destination: '/auth/interests',
      currentAddress: 'sara_art',
      backFromInterests: true,
    })
  })

  describe('stand-alone, opened from a page (FE-ONB-02), as on develop', () => {
    it.each<Record<string, string>>([
      { returnTo: '/settings' },
      { returnTo: '/settings', from: 'interests' },
    ])('sends an account that has a page back there (%j)', async (query) => {
      signIn()
      expect(await redirectOf(PageAddressScreen(props(query)))).toEqual(
        to('/settings')
      )
    })

    it('shows the step with no page, going back there afterwards', async () => {
      signIn({ alias: null })
      const element = await PageAddressScreen(props({ returnTo: '/studio' }))
      expect(element.type).toBe(PageAddressForm)
      expect(element.props).toMatchObject({
        destination: '/studio',
        returnTo: '/studio',
        currentAddress: null,
        backFromInterests: false,
      })
    })
  })
})

describe('InterestsScreen (/auth/interests)', () => {
  it('signed out, sends the account to sign in', async () => {
    expect(await redirectOf(InterestsScreen(props()))).toEqual(to('/auth'))
  })

  it.each([
    [{}, '/auth/category'],
    [
      { returnTo: '/settings' },
      { pathname: '/auth/category', query: { returnTo: '/settings' } },
    ],
  ])(
    'with a page and %j, goes on to the page category step',
    async (query, next) => {
      signIn()
      const element = await InterestsScreen(props(query))
      expect(element.type).toBe(InterestsForm)
      expect(element.props).toEqual({ viewerId: 42, next })
    }
  )

  it.each([
    [{}, '/studio'],
    [{ returnTo: '/creators/5' }, '/creators/5'],
  ])(
    'with no page and %j, goes on to its destination, past the category step',
    async (query, next) => {
      signIn({ alias: null })
      const element = await InterestsScreen(props(query))
      expect(element.type).toBe(InterestsForm)
      expect(element.props).toEqual({ viewerId: 42, next })
    }
  )
})

describe('PageCategoryScreen (/auth/category)', () => {
  it('signed out, sends the account to sign in', async () => {
    expect(
      await redirectOf(PageCategoryScreen(props({ returnTo: '/settings' })))
    ).toEqual(to({ pathname: '/auth', query: { returnTo: '/settings' } }))
  })

  it('sends an unverified account to verify its email', async () => {
    signIn({ isVerified: false })
    expect(await redirectOf(PageCategoryScreen(props()))).toEqual(
      to('/auth/verify-email')
    )
  })

  it.each([
    [{}, '/studio'],
    [{ returnTo: '/creators/5' }, '/creators/5'],
  ])(
    'with no page and %j, goes on to %s, not to make a page',
    async (query, href) => {
      signIn({ alias: null })
      expect(await redirectOf(PageCategoryScreen(props(query)))).toEqual(
        to(href)
      )
    }
  )

  it('with a page, starts from its category', async () => {
    signIn({ categoryId: 7 })
    const element = await PageCategoryScreen(props())
    expect(element.type).toBe(PageCategoryForm)
    expect(element.props).toEqual({
      viewerId: 42,
      currentCategoryId: 7,
      destination: '/studio',
      returnTo: undefined,
    })
  })

  it('with a page and no category, starts with none', async () => {
    signIn({ categoryId: null })
    const element = await PageCategoryScreen(props({ returnTo: '/settings' }))
    expect(element.props).toMatchObject({
      currentCategoryId: null,
      destination: '/settings',
      returnTo: '/settings',
    })
  })
})
