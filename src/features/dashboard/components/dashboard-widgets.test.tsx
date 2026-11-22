import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as I18nNavigation from '@/i18n/navigation'
import type {
  CreatorIdentity,
  DashboardPost,
  SetupFacts,
} from '@/features/dashboard/types/dashboard'
import { parseDashboardPosts } from '@/features/dashboard/schemas/dashboard'
import { renderWithIntl } from '../../../../test/render'

const mocks = vi.hoisted(() => ({
  publish: vi.fn(),
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))
vi.mock('@/features/dashboard/server/actions', () => ({
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
    ).toHaveAttribute('href', '/auth/url?returnTo=%2Fdashboard')
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
    // Still disabled until the refreshed page shows the published state.
    expect(bannerButton).toBeDisabled()
    expect(row).toBeDisabled()
  })

  it('ignores a second click in the same tick', async () => {
    mocks.publish.mockResolvedValue({ ok: true, data: null })
    renderWithIntl(
      <PublishPageProvider viewerId={42}>
        <PublishBanner viewerId={42} facts={ready} />
        <SetupChecklist facts={ready} />
      </PublishPageProvider>,
      strictEn
    )

    const bannerButton = screen.getByRole('button', { name: 'Publish page' })
    const row = screen.getByRole('button', { name: /Publish your page/ })
    await act(async () => {
      fireEvent.click(bannerButton)
      fireEvent.click(row)
    })

    expect(mocks.publish).toHaveBeenCalledOnce()
  })

  it('enables both again after a failure', async () => {
    mocks.publish.mockResolvedValue({ ok: false, status: 500 })
    const user = userEvent.setup()
    renderWithIntl(
      <PublishPageProvider viewerId={42}>
        <PublishBanner viewerId={42} facts={ready} />
        <SetupChecklist facts={ready} />
      </PublishPageProvider>,
      strictEn
    )

    await user.click(screen.getByRole('button', { name: 'Publish page' }))
    await user.click(screen.getByRole('button', { name: /Publish your page/ }))

    expect(mocks.publish).toHaveBeenCalledTimes(2)
    expect(mocks.toastError).toHaveBeenCalledTimes(2)
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
  pageName: 'Sara Atelier',
  displayName: 'Sara',
  alias: 'sara',
  avatarUrl: null,
}

describe('CreatorIdentityRow (FE-STUDIO-03 row 2)', () => {
  it('centres the page name and alias, with home and memberships tabs and no avatar', () => {
    renderWithIntl(<CreatorIdentityRow identity={identity} />, strictEn)

    expect(screen.getByRole('region', { name: 'Sara Atelier' })).toBeVisible()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByText('@sara')).toBeInTheDocument()
    const tabs = screen.getByRole('navigation', { name: 'Page sections' })
    expect(within(tabs).getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(
      within(tabs).getByRole('link', { name: 'Memberships' })
    ).toHaveAttribute('href', '/tiers')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('falls back to the display name, then the alias, then an unnamed label', () => {
    const { unmount } = renderWithIntl(
      <CreatorIdentityRow identity={{ ...identity, pageName: null }} />,
      strictEn
    )
    expect(screen.getByRole('region', { name: 'Sara' })).toBeInTheDocument()
    unmount()

    const second = renderWithIntl(
      <CreatorIdentityRow
        identity={{ ...identity, pageName: null, displayName: null }}
      />,
      strictEn
    )
    expect(screen.getByRole('region', { name: '@sara' })).toBeInTheDocument()
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
      screen.getByRole('region', { name: 'Unnamed page' })
    ).toBeInTheDocument()
  })
})

function post(overrides: Partial<DashboardPost> = {}): DashboardPost {
  return {
    id: 1,
    title: 'Hello members',
    body: null,
    excerpt: null,
    publishedAt: '2026-11-20T08:00:00.000Z',
    createdAt: '2026-11-20T08:00:00.000Z',
    audience: 'public',
    ...overrides,
  }
}

/** Parsed from a real `GET /content` owner item, so the body is branded as the API's. */
function apiPost(item: Record<string, unknown>): DashboardPost {
  const [parsed] = parseDashboardPosts({
    data: [
      {
        id: 1,
        type: 'text',
        title: 'Hello members',
        text: null,
        bodyFormat: 'plain',
        excerpt: null,
        creatorId: 42,
        collectionIds: [],
        createdAt: '2026-11-20T08:00:00.000Z',
        paywallPosition: null,
        visibility: {
          contentId: 1,
          type: true,
          datePublished: '2026-11-20T08:00:00.000Z',
        },
        access: 'FULL',
        ...item,
      },
    ],
    errors: null,
  })
  if (!parsed) throw new Error('fixture did not parse')
  return parsed
}

const PAGE_URL = 'https://fellowa.test/creators/42'

function renderPosts(
  result: Parameters<typeof RecentPosts>[0]['result'],
  {
    pageUrl = PAGE_URL,
    isPublished = true,
    locale = 'en',
  }: {
    pageUrl?: string | null
    isPublished?: boolean
    locale?: 'en' | 'fa'
  } = {}
) {
  return renderWithIntl(
    <RecentPosts result={result} pageUrl={pageUrl} isPublished={isPublished} />,
    { locale, strict: true }
  )
}

describe('RecentPosts (FE-STUDIO-02 row 4, FE-DASH-04)', () => {
  it('lists posts with their date, status text and the create action', () => {
    renderPosts({
      ok: true,
      posts: [
        post(),
        post({
          id: 2,
          title: 'Gold only',
          audience: 'tiers',
          publishedAt: null,
          createdAt: '2026-11-19T08:00:00.000Z',
        }),
        post({
          id: 3,
          title: 'Teaser first',
          audience: 'paywalled',
          publishedAt: '2026-11-18T08:00:00.000Z',
        }),
      ],
    })

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByText('Hello members')).toBeInTheDocument()
    expect(within(items[0]).getByText('Public')).toBeInTheDocument()
    expect(within(items[0]).getByText('Nov 20, 2026')).toBeInTheDocument()
    expect(
      within(items[1]).getByText('Locked for supporters')
    ).toBeInTheDocument()
    expect(within(items[1]).getByText('Draft')).toBeInTheDocument()
    expect(within(items[1]).getByText('Nov 19, 2026')).toBeInTheDocument()
    expect(
      within(items[2]).getByText('Public up to the paywall')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Create a new post' })
    ).toHaveAttribute('href', '/posts/new')
    expect(
      screen.getByRole('heading', { level: 2, name: 'Recent posts' })
    ).toHaveClass('text-title-sm')
    // Out: likes, comments, repost, stats and the comment box (no contract).
    expect(screen.queryByLabelText(/like|comment/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('shows the whole plain body as text, line breaks kept', () => {
    renderPosts({
      ok: true,
      posts: [apiPost({ text: 'First line\nSecond line', excerpt: 'First' })],
    })
    const body = screen.getByText(/First line/)
    expect(body).toHaveClass('whitespace-pre-line')
    expect(body.textContent).toBe('First line\nSecond line')
    expect(
      screen.queryByRole('link', { name: 'Read in the editor' })
    ).not.toBeInTheDocument()
  })

  it('renders an html body from the API string, and plain markup-looking text as text', () => {
    renderPosts({
      ok: true,
      posts: [
        apiPost({
          id: 1,
          title: 'Rich',
          bodyFormat: 'html',
          text: '<h2>Chapter</h2><p>one <strong>two</strong></p>',
          excerpt: 'Chapter one two',
        }),
        apiPost({
          id: 2,
          title: 'Plain',
          bodyFormat: 'plain',
          text: '<strong>not bold</strong>',
        }),
      ],
    })
    const [rich, plain] = ['Rich', 'Plain'].map((title) => {
      const item = screen.getByText(title).closest('li')
      if (!item) throw new Error(`no card for ${title}`)
      return item
    })
    expect(
      within(rich).getByRole('heading', { name: 'Chapter' })
    ).toBeInTheDocument()
    expect(within(rich).getByText('two').tagName).toBe('STRONG')
    expect(
      within(plain).getByText('<strong>not bold</strong>')
    ).toBeInTheDocument()
    expect(plain.querySelector('strong')).toBeNull()
  })

  it('clamps a long body and offers the rest in the editor', () => {
    renderPosts({
      ok: true,
      posts: [apiPost({ id: 8, text: 'word '.repeat(120) })],
    })
    expect(screen.getByText(/word word/)).toHaveClass('line-clamp-6')
    expect(
      screen.getByRole('link', { name: 'Read in the editor' })
    ).toHaveAttribute('href', '/posts/8/edit')
  })

  it('copies the post’s reader address to share it', async () => {
    const user = userEvent.setup()
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)
    renderPosts({ ok: true, posts: [post({ id: 9 })] })

    await user.click(screen.getByRole('button', { name: 'Share' }))

    expect(writeText).toHaveBeenCalledWith(
      'https://fellowa.test/creators/42/posts/9'
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Post link copied.')
  })

  it('says so when the clipboard refuses the post link', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('denied')
    )
    renderPosts({ ok: true, posts: [post()] })

    await user.click(screen.getByRole('button', { name: 'Share' }))

    expect(mocks.toastError).toHaveBeenCalledWith(
      "Couldn't copy the post link."
    )
  })

  it('offers no share for a draft, and holds it back while the page is unpublished or has no origin', () => {
    const { unmount } = renderPosts({
      ok: true,
      posts: [post({ publishedAt: null })],
    })
    expect(
      screen.queryByRole('button', { name: 'Share' })
    ).not.toBeInTheDocument()
    unmount()

    const second = renderPosts(
      { ok: true, posts: [post()] },
      { isPublished: false }
    )
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
    second.unmount()

    renderPosts({ ok: true, posts: [post()] }, { pageUrl: null })
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
  })

  it('searches the owner’s posts and clears the search', async () => {
    const user = userEvent.setup()
    renderPosts({
      ok: true,
      posts: [
        post({ id: 1, title: 'Studio tour' }),
        apiPost({ id: 2, title: 'Notes', text: 'Behind the scenes' }),
      ],
    })

    await user.type(
      screen.getByRole('searchbox', { name: 'Search posts' }),
      'scenes'
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Notes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows a no-match state that clears the filters', async () => {
    const user = userEvent.setup()
    renderPosts({ ok: true, posts: [post({ title: 'Studio tour' })] })

    await user.type(screen.getByRole('searchbox'), 'nothing like this')
    expect(screen.getByText('No posts match')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText('Studio tour')).toBeInTheDocument()
  })

  it('filters by audience and reorders by date', async () => {
    const user = userEvent.setup()
    renderPosts({
      ok: true,
      posts: [
        post({ id: 1, title: 'Newer free' }),
        post({
          id: 2,
          title: 'Older gold',
          audience: 'tiers',
          publishedAt: '2026-11-10T08:00:00.000Z',
        }),
      ],
    })

    await user.click(screen.getByRole('combobox', { name: 'Filter posts' }))
    await user.click(screen.getByRole('option', { name: 'Members only' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Older gold')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Filter posts' }))
    await user.click(screen.getByRole('option', { name: 'All posts' }))
    await user.click(screen.getByRole('combobox', { name: 'Sort posts' }))
    await user.click(screen.getByRole('option', { name: 'Oldest' }))
    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByText('Older gold')).toBeInTheDocument()
    expect(within(items[1]).getByText('Newer free')).toBeInTheDocument()
  })

  it('shows the newest five of the matches and links to all posts when there are more', async () => {
    const user = userEvent.setup()
    const posts = Array.from({ length: 7 }, (_, i) =>
      post({
        id: i + 1,
        title: `Post ${i + 1}`,
        publishedAt: `2026-11-${String(10 + i).padStart(2, '0')}T08:00:00.000Z`,
        audience: i < 6 ? 'public' : 'tiers',
      })
    )
    renderPosts({ ok: true, posts })

    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('Post 7')).toBeInTheDocument()
    expect(screen.queryByText('Post 2')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All posts' })).toHaveAttribute(
      'href',
      '/posts'
    )

    await user.click(screen.getByRole('combobox', { name: 'Filter posts' }))
    await user.click(screen.getByRole('option', { name: 'Members only' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(
      screen.queryByRole('link', { name: 'All posts' })
    ).not.toBeInTheDocument()
  })

  it('shows the empty state with the create action and no toolbar', () => {
    renderPosts({ ok: true, posts: [] })

    expect(screen.getByText('No posts yet')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Create a new post' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'All posts' })
    ).not.toBeInTheDocument()
  })

  it('shows its own error with a retry that re-reads the page', async () => {
    const user = userEvent.setup()
    renderPosts({ ok: false })

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Your posts couldn't be loaded"
    )
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  it('renders in Persian', () => {
    renderPosts(
      { ok: true, posts: [post({ audience: 'tiers' })] },
      { locale: 'fa' }
    )

    expect(screen.getByText('پست‌های اخیر')).toBeInTheDocument()
    expect(screen.getByText('قفل شده برای حامیان')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'اشتراک‌گذاری' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('searchbox', { name: 'جستجوی پست‌ها' })
    ).toBeInTheDocument()
  })
})
