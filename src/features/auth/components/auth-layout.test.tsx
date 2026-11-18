import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'
import { AuthLayout } from './auth-layout'
import { renderAuth } from './test-utils'

const route = vi.hoisted(() => ({
  pathname: '/auth',
  search: '',
}))
const explore = vi.hoisted(() => ({
  listExploreCategoriesForHook: vi.fn(),
  listExploreCreatorsForHook: vi.fn(),
}))
// The interests column reads the category list; the frame never fetches it.
vi.mock('@/features/explore/server/actions', () => explore)
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePathname: () => route.pathname,
}))
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSearchParams: () => new URLSearchParams(route.search),
}))

beforeEach(() => {
  route.pathname = '/auth'
  route.search = ''
})

function renderLayout(locale: 'en' | 'fa' = 'en') {
  const messages = locale === 'en' ? en : fa
  renderAuth(
    <AuthLayout>
      <h1>{messages.auth.phone.entry.title}</h1>
    </AuthLayout>,
    { locale }
  )
  return messages
}

const backLink = (messages: typeof en | typeof fa) =>
  screen.queryByRole('link', { name: messages.auth.layout.back })

describe('AuthLayout frame (presentation AuthLayout)', () => {
  it.each([
    { locale: 'en', home: '/' },
    { locale: 'fa', home: '/' },
  ] as const)(
    'has the logo, a content landmark and no theme switch in $locale',
    ({ locale, home }) => {
      const messages = renderLayout(locale)
      expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
      expect(
        screen.getByRole('link', { name: messages.common.skipToContent })
      ).toHaveAttribute('href', '#main-content')
      expect(
        screen.getByRole('link', { name: messages.auth.layout.home })
      ).toHaveAttribute('href', home)
      expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    }
  )

  it('has no back button on the first step', () => {
    const messages = renderLayout()
    expect(backLink(messages)).not.toBeInTheDocument()
  })

  it.each([
    ['/auth/otp', '/auth?returnTo=%2Fcreators%2F5'],
    ['/auth/password', '/auth?returnTo=%2Fcreators%2F5'],
    ['/auth/login/email', '/auth?returnTo=%2Fcreators%2F5'],
    ['/auth/forgot-password', '/auth/login/email?returnTo=%2Fcreators%2F5'],
  ])('on %s goes back to %s, keeping returnTo', (pathname, href) => {
    route.pathname = pathname
    route.search = 'returnTo=/creators/5'
    const messages = renderLayout()
    expect(backLink(messages)).toHaveAttribute('href', href)
  })

  it.each([
    // In sign-up (no page to return to): back to the account step.
    ['', '/auth/account'],
    // Opened from a page (settings' "no page" link, the studio checklist;
    // FE-ONB-02): back there.
    ['returnTo=/studio', '/studio'],
    ['returnTo=/settings', '/settings'],
    ['returnTo=/creators/5', '/creators/5'],
  ])('on /auth/url with %j goes back to %s', (search, href) => {
    route.pathname = '/auth/url'
    route.search = search
    const messages = renderLayout()
    expect(backLink(messages)).toHaveAttribute('href', href)
  })

  it.each([
    ['/auth/interests', '/auth/url'],
    ['/auth/category', '/auth/interests'],
  ])('on %s goes back to %s (FE-AUTH-08)', (pathname, href) => {
    route.pathname = pathname
    const messages = renderLayout()
    expect(backLink(messages)).toHaveAttribute('href', href)
  })

  it('drops an unsafe returnTo from the back link', () => {
    route.pathname = '/auth/otp'
    route.search = 'returnTo=//evil.example'
    const messages = renderLayout()
    expect(backLink(messages)).toHaveAttribute(
      'href',
      '/auth?returnTo=%2Fstudio'
    )
  })

  it.each(['/auth/account', '/auth/verify-email'])(
    'has no back button on %s',
    (pathname) => {
      route.pathname = pathname
      const messages = renderLayout()
      expect(backLink(messages)).not.toBeInTheDocument()
    }
  )
})

describe('AuthLayout visual column', () => {
  const visual = () => screen.getByRole('complementary', { hidden: true })

  it('shows the two sample creator cards with price and benefits', () => {
    const messages = renderLayout()
    const column = within(visual())
    const { samples } = messages.auth
    expect(column.getByText(samples.musician.tag)).toBeInTheDocument()
    expect(column.getByText(samples.podcaster.tag)).toBeInTheDocument()
    expect(column.getByText(samples.podcaster.benefit3)).toBeInTheDocument()
    expect(column.getByText('120,000')).toBeInTheDocument()
    expect(column.queryByRole('img')).not.toBeInTheDocument()
    expect(
      column.queryByText(messages.auth.preview.badge)
    ).not.toBeInTheDocument()
  })

  it('on the interests step, keeps the sample cards until the step has the topics, without asking for them', () => {
    route.pathname = '/auth/interests'
    const messages = renderLayout()
    const column = within(visual())
    expect(
      column.getByText(messages.auth.samples.musician.tag)
    ).toBeInTheDocument()
    expect(
      column.queryByText(messages.auth.interests.preview.badge)
    ).not.toBeInTheDocument()
    expect(explore.listExploreCategoriesForHook).not.toHaveBeenCalled()
  })

  it('keeps the sample cards on the page category step (the preview card has no category)', () => {
    route.pathname = '/auth/category'
    const messages = renderLayout()
    const column = within(visual())
    expect(
      column.getByText(messages.auth.samples.podcaster.tag)
    ).toBeInTheDocument()
    expect(
      column.queryByText(messages.auth.preview.badge)
    ).not.toBeInTheDocument()
  })

  it('shows the live page preview on the address step', () => {
    route.pathname = '/auth/url'
    const messages = renderLayout()
    const column = within(visual())
    expect(column.getByText(messages.auth.preview.badge)).toBeInTheDocument()
    expect(
      column.queryByText(messages.auth.samples.musician.tag)
    ).not.toBeInTheDocument()
  })
})
