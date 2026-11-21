import { screen, within } from '@testing-library/react'
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
const { CreatorIdentityRow } = await import('./creator-identity-row')
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

describe('PublishBanner (FE-STUDIO-02 row 1)', () => {
  it('offers publish while the page is unpublished', async () => {
    mocks.publish.mockResolvedValue({ ok: true, data: null })
    const user = userEvent.setup()
    renderWithIntl(<PublishBanner viewerId={42} facts={ready} />, strictEn)

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
    renderWithIntl(<PublishBanner viewerId={42} facts={ready} />, strictEn)

    await user.click(screen.getByRole('button', { name: 'Publish page' }))

    expect(mocks.toastError).toHaveBeenCalledWith(
      'Choose a username before you publish.'
    )
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('without a username, holds publish back and offers the address step', () => {
    renderWithIntl(
      <PublishBanner viewerId={42} facts={{ ...ready, username: null }} />,
      strictEn
    )

    expect(screen.getByRole('button', { name: 'Publish page' })).toBeDisabled()
    expect(
      screen.getByText('Choose a username before you publish.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Choose a username' })
    ).toHaveAttribute('href', '/auth/url?returnTo=%2Fstudio')
  })

  it('holds publish back with its reason before there is a tier', () => {
    renderWithIntl(
      <PublishBanner viewerId={42} facts={{ ...ready, hasTier: false }} />,
      strictEn
    )

    expect(screen.getByRole('button', { name: 'Publish page' })).toBeDisabled()
    expect(
      screen.getByText('Create a membership tier before you publish.')
    ).toBeInTheDocument()
  })

  it('shows the published status and no publish action once live', () => {
    renderWithIntl(
      <PublishBanner viewerId={42} facts={{ ...ready, isPublished: true }} />,
      strictEn
    )

    expect(
      screen.getByText('Your page is public and ready for members.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

const identity: CreatorIdentity = {
  pageName: 'Sara Studio',
  displayName: 'Sara',
  alias: 'sara',
  avatarUrl: null,
}

describe('CreatorIdentityRow (FE-STUDIO-02 row 2)', () => {
  it('names the page, shows the alias and links memberships to the tiers screen', () => {
    renderWithIntl(
      <CreatorIdentityRow
        viewerId={42}
        identity={identity}
        isPublished={false}
      />,
      strictEn
    )

    expect(
      screen.getByRole('heading', { name: 'Sara Studio' })
    ).toBeInTheDocument()
    expect(screen.getByText('@sara')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Memberships' })).toHaveAttribute(
      'href',
      '/studio/tiers'
    )
    // The public page answers 404 until published, so no link to it yet.
    expect(
      screen.queryByRole('link', { name: 'View public page' })
    ).not.toBeInTheDocument()
  })

  it('links the public page by account id once published', () => {
    renderWithIntl(
      <CreatorIdentityRow viewerId={42} identity={identity} isPublished />,
      strictEn
    )

    expect(
      screen.getByRole('link', { name: 'View public page' })
    ).toHaveAttribute('href', '/creators/42')
  })

  it('falls back to the display name, then the alias, then an unnamed label', () => {
    const { unmount } = renderWithIntl(
      <CreatorIdentityRow
        viewerId={42}
        identity={{ ...identity, pageName: null }}
        isPublished={false}
      />,
      strictEn
    )
    expect(screen.getByRole('heading', { name: 'Sara' })).toBeInTheDocument()
    unmount()

    const second = renderWithIntl(
      <CreatorIdentityRow
        viewerId={42}
        identity={{ ...identity, pageName: null, displayName: null }}
        isPublished={false}
      />,
      strictEn
    )
    expect(screen.getByRole('heading', { name: '@sara' })).toBeInTheDocument()
    expect(screen.getAllByText('@sara')).toHaveLength(1)
    second.unmount()

    renderWithIntl(
      <CreatorIdentityRow
        viewerId={42}
        identity={{
          pageName: null,
          displayName: null,
          alias: null,
          avatarUrl: null,
        }}
        isPublished={false}
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
            post({ id: 3, title: 'Teaser first', audience: 'paywalled' }),
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
