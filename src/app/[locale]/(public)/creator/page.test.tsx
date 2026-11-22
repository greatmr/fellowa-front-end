import { screen } from '@testing-library/react'
import { createTranslator } from 'next-intl'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as I18nNavigation from '@/i18n/navigation'
import en from '../../../../../messages/en.json'
import { renderWithIntl } from '../../../../../test/render'

// The route's own decisions: sign-in and verification redirects, and the
// no-page notice. The loader and the view have their own tests.
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  redirect: vi.fn((): never => {
    throw new Error('NEXT_REDIRECT')
  }),
}))
vi.mock('@/features/creator-page/server/load-own-creator-page', () => ({
  loadOwnCreatorPage: mocks.load,
}))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nNavigation>()),
  redirect: mocks.redirect,
}))
vi.mock('next-intl/server', () => ({
  setRequestLocale: () => {},
  getTranslations: async (namespace: 'creatorPage.ownPage') =>
    createTranslator({ locale: 'en', messages: en, namespace }),
}))

vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.fellowa.test/api')
const { default: Page } = await import('./page')
afterAll(() => vi.unstubAllEnvs())

const props = (tab?: string) => ({
  params: Promise.resolve({ locale: 'en' }),
  searchParams: Promise.resolve({ tab }),
})

beforeEach(() => {
  mocks.load.mockReset()
  mocks.redirect.mockClear()
})

describe('/creator (BE-LAND-10)', () => {
  it('sends a signed-out visitor to sign in and back to /creator', async () => {
    mocks.load.mockResolvedValue({ kind: 'signedOut' })

    await expect(Page(props())).rejects.toThrow('NEXT_REDIRECT')
    expect(mocks.redirect).toHaveBeenCalledWith({
      href: { pathname: '/auth', query: { returnTo: '/creator' } },
      locale: 'en',
    })
  })

  it('sends an unverified account to verify its email', async () => {
    mocks.load.mockResolvedValue({ kind: 'unverified' })

    await expect(Page(props())).rejects.toThrow('NEXT_REDIRECT')
    expect(mocks.redirect).toHaveBeenCalledWith({
      href: '/auth/verify-email',
      locale: 'en',
    })
  })

  it('without a username shows the address notice, which returns here', async () => {
    mocks.load.mockResolvedValue({ kind: 'noPage' })

    renderWithIntl(await Page(props()), { locale: 'en', strict: true })

    expect(
      screen.getByRole('heading', { level: 1, name: 'My page' })
    ).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your page starts with its address.'
    )
    expect(
      screen.getByRole('link', { name: 'Choose an address' })
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/\/auth\/url\?returnTo=%2Fcreator$/)
    )
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
