import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as I18nNavigation from '@/i18n/navigation'
import type {
  CreatorIdentity,
  DashboardPost,
  SetupFacts,
} from '@/features/studio/types/dashboard'
import { renderWithIntl } from '../../../../test/render'

const mocks = vi.hoisted(() => ({
  publish: vi.fn(),
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))
vi.mock('@/features/studio/server/actions', () => ({
  publishPageAction: mocks.publish,
}))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nNavigation>()),
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}))

const { PublishBanner } = await import('./publish-banner')
const { PublishPageProvider } = await import('./publish-page-provider')
const { SetupChecklist } = await import('./setup-checklist')
const { CreatorIdentityRow } = await import('./creator-identity-row')
const { PublicAddressRow } = await import('./public-address-row')
const { RecentPosts } = await import('./recent-posts')

const ready: SetupFacts = {
  username: 'sara',
  hasProfileImages: false,
  hasTier: true,
  hasPost: false,
  hasPayoutDetails: false,
  isPublished: false,
}

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset()
})

const strictEn = { locale: 'en', strict: true } as const

function renderBanner(facts: SetupFacts) {
  return renderWithIntl(
    <PublishPageProvider viewerId={42}>
      <PublishBanner viewerId={42} facts={facts} />
    </PublishPageProvider>,
    strictEn
  )
}

describe('PublishBanner (FE-STUDIO-02 row 1)', () => {
  it('offers publish while the page is unpublished', async () => {
    mocks.publish.mockResolvedValue({ ok: true, data: null })
    const user = userEvent.setup()
    renderBanner(ready)

    expect(
      screen.getByText("Your page isn't published yet.")
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Publish page' }))

    expect(mocks.publish).toHaveBeenCalledWith(42)
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  it('shows USER_ALIAS_REQUIRED as the username message and does not refresh', async () => {
    mocks.publish.mockResolvedValue({
      ok: false,
      status: 400,
      code: 'USER_ALIAS_REQUIRED',
    })
    const user = userEvent.setup()
    renderBanner(ready)

    await user.click(screen.getByRole('button', { name: 'Publish page' }))

    expect(mocks.toastError).toHaveBeenCalledWith(
      'Choose a username before you publish.'
    )
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('without a username, holds publish back and offers the address step', () => {
    renderBanner({ ...ready, username: null })

    expect(screen.getByRole('button', { name: 'Publish page' })).toBeDisabled()
    expect(
      screen.getByText('Choose a username before you publish.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Choose a username' })
    ).toHaveAttribute('href', '/auth/url?returnTo=%2Fstudio')
  })

  it('holds publish back with its reason before there is a tier', () => {
    renderBanner({ ...ready, hasTier: false })

    expect(screen.getByRole('button', { name: 'Publish page' })).toBeDisabled()
    expect(
      screen.getByText('Create a membership tier before you publish.')
    ).toBeInTheDocument()
  })

  it('shows the published status and the public page link once live', () => {
    renderBanner({ ...ready, isPublished: true })

    expect(
      screen.getByText('Your page is public and ready for members.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'View public page' })
    ).toHaveAttribute('href', '/creators/42')
  })
})

describe('one publish action for the banner and the checklist (FE-STUDIO-03 row 3)', () => {
  it('sends one request and disables both while it is pending', async () => {
    let resolve: (value: { ok: true; data: null }) => void = () => {}
    mocks.publish.mockReturnValue(
      new Promise((done) => {
        resolve = done
      })
    )
    const user = userEvent.setup()
    renderWithIntl(
      <PublishPageProvider viewerId={42}>
        <PublishBanner viewerId={42} facts={ready} />
        <SetupChecklist facts={ready} />
      </PublishPageProvider>,
      strictEn
    )

    const bannerButton = screen.getByRole('button', { name: 'Publish page' })
    const row = screen.getByRole('button', { name: /Publish your page/ })
    await user.click(bannerButton)

    expect(bannerButton).toBeDisabled()
    expect(row).toBeDisabled()
    await user.click(row)
    expect(mocks.publish).toHaveBeenCalledOnce()

    await act(async () => resolve({ ok: true, data: null }))
    expect(mocks.refresh).toHaveBeenCalledOnce()
    expect(mocks.toastSuccess).toHaveBeenCalledOnce()
    expect(bannerButton).toBeEnabled()
  })

  it('reports a failure once, from either place', async () => {
    mocks.publish.mockResolvedValue({ ok: false, status: 500 })
    const user = userEvent.setup()
    renderWithIntl(
      <PublishPageProvider viewerId={42}>
        <PublishBanner viewerId={42} facts={ready} />
        <SetupChecklist facts={ready} />
      </PublishPageProvider>,
      strictEn
    )

    await user.click(screen.getByRole('button', { name: /Publish your page/ }))

    expect(mocks.toastError).toHaveBeenCalledExactlyOnceWith(
      'The page could not be published. Try again.'
    )
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})

describe('PublicAddressRow (FE-STUDIO-03 row 4)', () => {
  it('copies the absolute /creators/:id address once published', async () => {
    const user = userEvent.setup()
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)
    renderWithIntl(
      <PublicAddressRow
        path="/creators/42"
        url="https://fellowa.test/creators/42"
        isPublished
      />,
      strictEn
    )

    expect(
      screen.getByText('https://fellowa.test/creators/42')
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Copy address' }))

    expect(writeText).toHaveBeenCalledExactlyOnceWith(
      'https://fellowa.test/creators/42'
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Address copied.')
  })

  it('says so when the clipboard refuses', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('denied')
    )
    renderWithIntl(
      <PublicAddressRow
        path="/creators/42"
        url="https://fellowa.test/creators/42"
        isPublished
      />,
      strictEn
    )

    await user.click(screen.getByRole('button', { name: 'Copy address' }))

    expect(mocks.toastError).toHaveBeenCalledWith(
      "The address couldn't be copied. Copy it by hand."
    )
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it('shows the address but holds copy back until the page is published', () => {
    renderWithIntl(
      <PublicAddressRow
        path="/creators/42"
        url="https://fellowa.test/creators/42"
        isPublished={false}
      />,
      strictEn
    )

    expect(screen.getByRole('button', { name: 'Copy address' })).toBeDisabled()
    expect(
      screen.getByText(
        "Your page isn't public yet. You can copy its address once it's published."
      )
    ).toBeInTheDocument()
  })

  it('holds copy back without a configured origin, showing the path', () => {
    renderWithIntl(
      <PublicAddressRow path="/creators/42" url={null} isPublished />,
      strictEn
    )

    expect(screen.getByText('/creators/42')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy address' })).toBeDisabled()
  })

  it('renders in Persian', () => {
    renderWithIntl(
      <PublicAddressRow path="/creators/42" url={null} isPublished={false} />,
      { locale: 'fa', strict: true }
    )
    expect(screen.getByRole('button', { name: 'کپی آدرس' })).toBeDisabled()
  })
})

const identity: CreatorIdentity = {
  pageName: 'Sara Studio',
  displayName: 'Sara',
  alias: 'sara',
  avatarUrl: null,
}

describe('CreatorIdentityRow (FE-STUDIO-03 row 2)', () => {
  it('centres the page name and alias, with home and memberships tabs and no avatar', () => {
    renderWithIntl(<CreatorIdentityRow identity={identity} />, strictEn)

    expect(
      screen.getByRole('heading', { name: 'Sara Studio' })
    ).toBeInTheDocument()
    expect(screen.getByText('@sara')).toBeInTheDocument()
    const tabs = screen.getByRole('navigation', { name: 'Page sections' })
    expect(within(tabs).getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(
      within(tabs).getByRole('link', { name: 'Memberships' })
    ).toHaveAttribute('href', '/studio/tiers')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('falls back to the display name, then the alias, then an unnamed label', () => {
    const { unmount } = renderWithIntl(
      <CreatorIdentityRow identity={{ ...identity, pageName: null }} />,
      strictEn
    )
    expect(screen.getByRole('heading', { name: 'Sara' })).toBeInTheDocument()
    unmount()

    const second = renderWithIntl(
      <CreatorIdentityRow
        identity={{ ...identity, pageName: null, displayName: null }}
      />,
      strictEn
    )
    expect(screen.getByRole('heading', { name: '@sara' })).toBeInTheDocument()
    expect(screen.getAllByText('@sara')).toHaveLength(1)
    second.unmount()

    renderWithIntl(
      <CreatorIdentityRow
        identity={{
          pageName: null,
          displayName: null,
          alias: null,
          avatarUrl: null,
        }}
      />,
      strictEn
    )
    expect(
      screen.getByRole('heading', { name: 'Unnamed page' })
    ).toBeInTheDocument()
  })
})

function post(overrides: Partial<DashboardPost> = {}): DashboardPost {
  return {
    id: 1,
    title: 'Hello members',
    excerpt: null,
    publishedAt: '2026-11-20T08:00:00.000Z',
    createdAt: '2026-11-20T08:00:00.000Z',
    audience: 'public',
    ...overrides,
  }
}

describe('RecentPosts (FE-STUDIO-02 row 4)', () => {
  it('lists posts with their date and audience, and the create action', () => {
    renderWithIntl(
      <RecentPosts
        result={{
          ok: true,
          posts: [
            post(),
            post({
              id: 2,
              title: 'Gold only',
              audience: 'tiers',
              publishedAt: null,
              createdAt: '2026-11-21T08:00:00.000Z',
            }),
            post({
              id: 3,
              title: 'Teaser first',
              audience: 'paywalled',
              excerpt: 'The opening paragraph',
            }),
          ],
        }}
      />,
      strictEn
    )

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByText('Hello members')).toBeInTheDocument()
    expect(within(items[0]).getByText('Public')).toBeInTheDocument()
    expect(within(items[0]).getByText('Nov 20, 2026')).toBeInTheDocument()
    expect(
      within(items[1]).getByText('Locked for supporters')
    ).toBeInTheDocument()
    expect(within(items[1]).getByText('Draft')).toBeInTheDocument()
    expect(within(items[1]).getByText('Nov 21, 2026')).toBeInTheDocument()
    expect(
      within(items[2]).getByText('Public up to the paywall')
    ).toBeInTheDocument()
    expect(
      within(items[2]).getByText('The opening paragraph')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Create a new post' })
    ).toHaveAttribute('href', '/studio/posts/new')
    // No counts: GET /content carries none, so none are shown.
    expect(screen.queryByLabelText(/like/i)).not.toBeInTheDocument()
  })

  it('shows the newest five and links to all posts when there are more', () => {
    const posts = Array.from({ length: 6 }, (_, i) =>
      post({ id: i + 1, title: `Post ${i + 1}` })
    )
    renderWithIntl(<RecentPosts result={{ ok: true, posts }} />, strictEn)

    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.queryByText('Post 6')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All posts' })).toHaveAttribute(
      'href',
      '/studio/posts'
    )
  })

  it('shows the empty state with the create action still offered', () => {
    renderWithIntl(<RecentPosts result={{ ok: true, posts: [] }} />, strictEn)

    expect(screen.getByText('No posts yet')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Create a new post' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'All posts' })
    ).not.toBeInTheDocument()
  })

  it('shows its own error with a retry that re-reads the page', async () => {
    const user = userEvent.setup()
    renderWithIntl(<RecentPosts result={{ ok: false }} />, strictEn)

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Your posts couldn't be loaded"
    )
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  it('renders in Persian', () => {
    renderWithIntl(
      <RecentPosts
        result={{ ok: true, posts: [post({ audience: 'tiers' })] }}
      />,
      { locale: 'fa', strict: true }
    )

    expect(screen.getByText('پست‌های اخیر')).toBeInTheDocument()
    expect(screen.getByText('قفل شده برای حامیان')).toBeInTheDocument()
  })
})
