import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as I18nNavigation from '@/i18n/navigation'

// The follow action is tested in follow-button.test.tsx and actions.test.ts;
// the post-list action's HTTP boundary in actions.test.ts. The real hook and
// QueryClient run here; only the server action is replaced.
const actions = vi.hoisted(() => ({
  setFollowingAction: vi.fn(),
  listCreatorPostsAction: vi.fn(),
  listCreatorCollectionPostsAction: vi.fn(),
}))
vi.mock('@/features/creator-page/server/actions', () => actions)
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nNavigation>()),
  useRouter: () => ({ refresh: vi.fn() }),
}))

import type { CreatorPageViewer } from '@/features/creator-page/server/load-creator-page'
import type {
  CreatorCollection,
  CreatorPostPage,
  CreatorProfile,
  CreatorTier,
} from '@/features/creator-page/types/creator-page'
import { renderWithIntl } from '../../../../test/render'
import {
  parseCreatorCollections,
  parseCreatorPostPage,
} from '../schemas/creator-page'
import {
  FREE_BODY,
  OPEN_PART,
  PREVIEW,
  ok,
  rawCollection,
  rawFull,
  rawPartial,
  rawPostPage,
  rawTeaser,
} from '../test/fixtures'
import { creatorPageTab } from '../lib/tabs'
import { CreatorPageView } from './creator-page-view'

const profile: CreatorProfile = {
  id: 4,
  alias: 'dana',
  pageName: null,
  avatarUrl: null,
  coverUrl: null,
  bio: 'Painter of small things',
  categoryId: 2,
  followerCount: 1200,
  links: [{ kind: 'instagram', url: 'https://instagram.com/dana' }],
  viewerFollows: null,
}
const tiers: CreatorTier[] = [
  {
    id: 7,
    title: 'Supporter',
    description: 'Monthly support',
    priceToman: 50000,
    coverUrl: 'https://cdn.test/tier.png',
    benefits: [{ id: 2, title: 'Early posts' }],
  },
]

/** A page of the list, through the real parser, from backend-shaped items. */
const postPage = (
  items: unknown[],
  page?: { total?: number; next?: number | null }
): CreatorPostPage => parseCreatorPostPage(ok(rawPostPage(items, page)), 4)

const PAGE_URL = 'https://fellowa.test/creators/4'

type Overrides = {
  profile?: Partial<CreatorProfile>
  tiers?: CreatorTier[] | null
  posts?: CreatorPostPage | null
  collections?: CreatorCollection[] | null
  categoryTitle?: string | null
  pageUrl?: string | null
  initialTab?: 'posts' | 'collections' | 'tiers' | 'about'
}

function view(viewer: CreatorPageViewer, overrides: Overrides = {}) {
  return (
    <CreatorPageView
      profile={{ ...profile, ...overrides.profile }}
      tiers={overrides.tiers === undefined ? tiers : overrides.tiers}
      posts={
        overrides.posts === undefined ? postPage([rawFull()]) : overrides.posts
      }
      collections={overrides.collections ?? null}
      categoryTitle={
        overrides.categoryTitle === undefined
          ? 'Music'
          : overrides.categoryTitle
      }
      viewer={viewer}
      pageUrl={overrides.pageUrl === undefined ? PAGE_URL : overrides.pageUrl}
      initialTab={overrides.initialTab}
    />
  )
}

function render(ui: ReactElement, locale: 'fa' | 'en' = 'en') {
  const client = new QueryClient({
    // The app's staleTime (src/lib/api/query-client.ts), so the page the
    // server rendered is not refetched on mount.
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  return renderWithIntl(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
    { locale, strict: true }
  )
}

const renderPage = (
  viewer: CreatorPageViewer,
  overrides: Overrides = {},
  locale: 'fa' | 'en' = 'en'
) => render(view(viewer, overrides), locale)

/** The page itself, not the sticky header's inert copy of its controls. */
const page = () => within(screen.getByRole('article'))

beforeEach(() => {
  window.history.replaceState(null, '', '/en/creators/4')
})

afterEach(() => {
  vi.unstubAllGlobals()
  actions.listCreatorPostsAction.mockReset()
  actions.listCreatorCollectionPostsAction.mockReset()
})

describe('CreatorPageView (FE-PAGE-01/03)', () => {
  describe('identity', () => {
    it('shows the name, category, follower and post chips', () => {
      renderPage('anonymous', { posts: postPage([rawFull()], { total: 41 }) })

      expect(
        screen.getByRole('heading', { level: 1, name: '@dana' })
      ).toBeVisible()
      expect(page().getByText('Music')).toBeVisible()
      expect(
        page().getByText('1,200', { exact: false }).closest('span')
      ).toHaveTextContent('1,200 followers')
      expect(page().getByText(/published posts/)).toHaveTextContent(
        '41 published posts'
      )
      // No member count is public (FQ-32 item 3).
      expect(screen.queryByText(/\d[^]*\bmembers?\b/i)).toBeNull()
    })

    it('shows the public page name with the alias under it (FQ-17)', () => {
      renderPage('anonymous', { profile: { pageName: 'Dana Atelier' } })

      expect(
        screen.getByRole('heading', { level: 1, name: 'Dana Atelier' })
      ).toBeVisible()
      expect(page().getByText('@dana')).toBeVisible()
    })

    it('falls back to the unnamed copy with neither a name nor an alias', () => {
      renderPage('anonymous', { profile: { alias: null } })

      expect(
        screen.getByRole('heading', { level: 1, name: 'Unnamed creator' })
      ).toBeVisible()
    })

    it('renders in Persian with every key present', () => {
      renderPage('anonymous', {}, 'fa')

      expect(page().getByText('۱٬۲۰۰', { exact: false })).toBeVisible()
      expect(page().getByRole('tab', { name: /پلن‌های عضویت/ })).toBeVisible()
    })
  })

  describe('actions per viewer', () => {
    it('sends an anonymous visitor to sign in to follow; Support opens Tiers', async () => {
      const user = userEvent.setup()
      renderPage('anonymous')

      expect(
        page().getByRole('link', { name: 'Follow' }).getAttribute('href')
      ).toMatch(/\/auth\?returnTo=%2Fcreators%2F4$/)
      await user.click(page().getByRole('button', { name: 'Support / Join' }))
      expect(page().getByRole('tab', { name: /tiers/ })).toHaveAttribute(
        'aria-selected',
        'true'
      )
      expect(window.location.search).toBe('?tab=tiers')
      // Join waits for checkout for everyone (FQ-32 item 6).
      expect(
        page().getByRole('button', { name: 'Join this tier' })
      ).toBeDisabled()
      expect(page().getByText('Joining a tier opens soon.')).toBeVisible()
    })

    it('gives a signed-in visitor a working Follow and a disabled Join', async () => {
      const user = userEvent.setup()
      renderPage('signedIn')

      expect(page().getByRole('button', { name: 'Follow' })).toBeEnabled()
      expect(page().queryByRole('link', { name: 'Follow' })).toBeNull()
      await user.click(page().getByRole('button', { name: 'Support / Join' }))
      const panel = screen.getByRole('tabpanel', { name: /tiers/ })
      expect(
        within(panel).getByRole('button', { name: 'Join this tier' })
      ).toBeDisabled()
      expect(
        within(panel).getByText('Joining a tier opens soon.')
      ).toBeVisible()
    })

    it('shows Following when the backend says the viewer follows', () => {
      renderPage('signedIn', { profile: { viewerFollows: true } })

      expect(page().getByRole('button', { name: 'Following' })).toBeEnabled()
    })

    it('offers the owner the preview bar, edit and copy, no self-follow or join', async () => {
      const user = userEvent.setup()
      renderPage('owner')

      expect(page().getByText(/live preview of your public page/)).toBeVisible()
      // Once, in the preview bar: the hero repeats neither edit nor copy.
      expect(
        page().getByRole('link', { name: 'Edit page' }).getAttribute('href')
      ).toMatch(/\/settings$/)
      expect(page().queryByRole('button', { name: 'Share' })).toBeNull()
      expect(
        page().getByRole('button', { name: 'Copy page link' })
      ).toBeEnabled()
      expect(page().queryByRole('button', { name: /Follow/ })).toBeNull()
      expect(page().queryByRole('link', { name: 'Follow' })).toBeNull()
      expect(
        page().queryByRole('button', { name: 'Support / Join' })
      ).toBeNull()
      await user.click(page().getByRole('tab', { name: /tiers/ }))
      expect(screen.queryByText('Join this tier')).toBeNull()
    })

    it('shows no preview bar to anyone but the owner', () => {
      renderPage('signedIn')

      expect(screen.queryByText(/live preview of your public page/)).toBeNull()
    })
  })

  describe('copy link', () => {
    it('copies NEXT_PUBLIC_APP_URL + /creators/:id', async () => {
      const user = userEvent.setup()
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      })
      renderPage('anonymous')

      await user.click(page().getByRole('button', { name: 'Share' }))

      expect(writeText).toHaveBeenCalledWith(PAGE_URL)
    })

    it('cannot copy without a configured origin', () => {
      renderPage('anonymous', { pageUrl: null })
      expect(page().getByRole('button', { name: 'Share' })).toBeDisabled()
    })

    it("cannot copy the owner's link without a configured origin", () => {
      renderPage('owner', { pageUrl: null })
      expect(
        page().getByRole('button', { name: 'Copy page link' })
      ).toBeDisabled()
    })
  })

  describe('posts tab (Q-51)', () => {
    const mixed = () => postPage([rawFull(), rawPartial(), rawTeaser()])

    it('renders FULL, PARTIAL and TEASER as the server sent them', () => {
      const { container } = renderPage('anonymous', { posts: mixed() })

      expect(screen.getByText(FREE_BODY)).toBeVisible()
      expect(screen.getByText(OPEN_PART).closest('.teaser-fade')).not.toBeNull()
      expect(screen.getByText(PREVIEW).closest('.teaser-fade')).not.toBeNull()
      expect(screen.getAllByText('Free for everyone')).toHaveLength(1)
      expect(
        screen.getAllByText('Members only', { selector: 'span' })
      ).toHaveLength(2)
      expect(
        screen.getAllByRole('region', {
          name: "This post is for the creator's members",
        })
      ).toHaveLength(2)
      // The gate has no purchase (FQ-31) and no like or comment counts.
      expect(container).not.toHaveTextContent(/buy|purchase|comment|like/i)
    })

    it('renders an html body (BE-CONT-14) as the server’s blocks, and a plain one as text', () => {
      const { container } = renderPage('anonymous', {
        posts: postPage([
          {
            ...rawPartial(
              10,
              '<h2 dir="auto">Open part</h2><p>a <em>b</em></p>'
            ),
            bodyFormat: 'html',
          },
          { ...rawFull(9), text: '<em>literal</em>', bodyFormat: 'plain' },
        ]),
      })
      expect(
        screen.getByRole('heading', { level: 2, name: 'Open part' })
      ).toBeVisible()
      expect(screen.getByText('b').tagName).toBe('EM')
      expect(screen.getByText('<em>literal</em>')).toBeVisible()
      expect(container.querySelectorAll('em')).toHaveLength(1)
    })

    it('never renders a gated body: TEASER with no preview shows only the gate', () => {
      const { container } = renderPage('anonymous', {
        posts: postPage([rawTeaser(11, null), rawPartial(10, null)]),
      })

      expect(container).not.toHaveTextContent(PREVIEW)
      expect(container).not.toHaveTextContent(OPEN_PART)
      expect(container).not.toHaveTextContent(FREE_BODY)
      expect(
        screen.getAllByRole('button', { name: 'See the tiers' })
      ).toHaveLength(2)
    })

    it('links each post to its reader (FE-CONT-01)', () => {
      renderPage('anonymous', { posts: mixed() })

      expect(
        screen.getByRole('link', { name: 'Hello world' }).getAttribute('href')
      ).toMatch(/\/creators\/4\/posts\/9$/)
      for (const link of screen.getAllByRole('link', {
        name: 'Open the post',
      })) {
        expect(link.getAttribute('href')).toMatch(
          /\/creators\/4\/posts\/1[01]$/
        )
      }
    })

    it("the gate's call to action opens the Tiers tab", async () => {
      const user = userEvent.setup()
      renderPage('anonymous', { posts: postPage([rawTeaser()]) })

      await user.click(screen.getByRole('button', { name: 'See the tiers' }))

      expect(page().getByRole('tab', { name: /tiers/ })).toHaveAttribute(
        'aria-selected',
        'true'
      )
      expect(screen.getByRole('heading', { name: 'Supporter' })).toBeVisible()
    })

    it('filters on the level the server sent', async () => {
      const user = userEvent.setup()
      renderPage('anonymous', { posts: mixed() })

      await user.click(screen.getByRole('button', { name: 'Free posts' }))
      expect(screen.getByText('Showing 1 of 3 loaded posts')).toBeVisible()
      expect(screen.getByRole('link', { name: 'Hello world' })).toBeVisible()
      expect(screen.queryByRole('link', { name: 'Half open' })).toBeNull()

      await user.click(screen.getByRole('button', { name: 'Members only' }))
      expect(screen.getByText('Showing 2 of 3 loaded posts')).toBeVisible()
      expect(screen.queryByRole('link', { name: 'Hello world' })).toBeNull()
    })

    it('says when a filter finds nothing and offers all posts', async () => {
      const user = userEvent.setup()
      renderPage('anonymous', { posts: postPage([rawFull()]) })

      await user.click(screen.getByRole('button', { name: 'Members only' }))
      expect(
        screen.getByText('No posts in this category among those loaded.')
      ).toBeVisible()
      await user.click(screen.getByRole('button', { name: 'Show all posts' }))
      expect(screen.getByRole('link', { name: 'Hello world' })).toBeVisible()
    })

    it('keeps the page when only the post list failed', () => {
      renderPage('anonymous', { posts: null })

      expect(
        screen.getByRole('heading', { level: 1, name: '@dana' })
      ).toBeVisible()
      expect(
        screen.getByText("Posts couldn't be loaded. Try again later.")
      ).toBeVisible()
      expect(page().queryByText(/published posts/)).toBeNull()
      expect(page().getByRole('tab', { name: /^Posts$/ })).toBeVisible()
    })

    it('keeps the filter when returning from another tab', async () => {
      const user = userEvent.setup()
      renderPage('anonymous', {
        posts: postPage([rawFull(), rawPartial(), rawTeaser()]),
      })

      await user.click(screen.getByRole('button', { name: 'Free posts' }))
      await user.click(page().getByRole('tab', { name: 'About' }))
      await user.click(page().getByRole('tab', { name: /Posts/ }))

      expect(
        screen.getByRole('button', { name: 'Free posts' })
      ).toHaveAttribute('aria-pressed', 'true')
    })

    it('shows the empty state when the creator has no posts', () => {
      renderPage('anonymous', { posts: postPage([]) })

      expect(screen.getByText('No posts yet.')).toBeVisible()
    })

    it('loads the next page and keeps each post once', async () => {
      const user = userEvent.setup()
      actions.listCreatorPostsAction.mockResolvedValue({
        ok: true,
        data: postPage([rawFull(9), rawTeaser(12)], { total: 3 }),
      })
      renderPage('anonymous', {
        posts: postPage([rawFull(9), rawPartial(10)], { total: 3, next: 2 }),
      })

      await user.click(screen.getByRole('button', { name: 'Load more posts' }))

      expect(
        await screen.findByRole('link', { name: 'Members video' })
      ).toBeVisible()
      expect(actions.listCreatorPostsAction).toHaveBeenCalledWith({
        creatorId: 4,
        page: 2,
      })
      expect(screen.getAllByRole('link', { name: 'Hello world' })).toHaveLength(
        1
      )
      expect(
        screen.queryByRole('button', { name: 'Load more posts' })
      ).toBeNull()
    })

    it('offers a retry when the next page fails', async () => {
      const user = userEvent.setup()
      actions.listCreatorPostsAction.mockResolvedValue({
        ok: false,
        status: 500,
      })
      renderPage('anonymous', {
        posts: postPage([rawFull()], { total: 30, next: 2 }),
      })

      await user.click(screen.getByRole('button', { name: 'Load more posts' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        "More posts couldn't be loaded."
      )
      expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
    })

    it('dates posts in Tehran time (owner decision 2026-10-30)', () => {
      // 22:00 UTC on the 30th is 01:30 on the 31st in Tehran (UTC+3:30).
      renderPage('anonymous', {
        posts: postPage([
          { ...rawFull(), createdAt: '2026-10-30T22:00:00.000Z' },
        ]),
      })

      expect(screen.getByText('Oct 31, 2026')).toHaveAttribute(
        'dateTime',
        '2026-10-30T22:00:00.000Z'
      )
    })
  })

  describe('tiers tab', () => {
    it('prices a tier in Toman per month, with cover and benefits, no badge, trial or supporters', () => {
      renderPage('anonymous', { initialTab: 'tiers' })

      const card = screen
        .getByRole('heading', { name: 'Supporter' })
        .closest('[data-slot="card"]')
      expect(card).not.toBeNull()
      const scope = within(card as HTMLElement)
      expect(scope.getByText('50,000').closest('p')).toHaveTextContent(
        '50,000 Toman/ month'
      )
      expect(
        scope.getByRole('img', { name: 'Cover of Supporter' })
      ).toHaveAttribute('src', 'https://cdn.test/tier.png')
      expect(scope.getByText('Early posts')).toBeVisible()
      expect(card).not.toHaveTextContent(/popular|trial|supporters/i)
    })

    it('uses Persian digits and the Persian unit in fa', () => {
      renderPage('anonymous', { initialTab: 'tiers' }, 'fa')

      expect(screen.getByText('۵۰٬۰۰۰').closest('p')).toHaveTextContent(
        '۵۰٬۰۰۰ تومان'
      )
    })

    it('shows the empty state with no tiers', () => {
      renderPage('anonymous', { tiers: [], initialTab: 'tiers' })

      expect(screen.getByText('No tiers yet.')).toBeVisible()
    })

    it('keeps the page when only the tier list failed', () => {
      renderPage('anonymous', { tiers: null, initialTab: 'tiers' })

      expect(
        screen.getByRole('heading', { level: 1, name: '@dana' })
      ).toBeVisible()
      expect(
        screen.getByText("Tiers couldn't be loaded. Try again later.")
      ).toBeVisible()
    })
  })

  describe('about tab', () => {
    it('opens social links in a new tab without passing the referrer', () => {
      renderPage('anonymous', { initialTab: 'about' })

      const link = screen.getByRole('link', { name: /Instagram/ })
      expect(link).toHaveAttribute('href', 'https://instagram.com/dana')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc')
    })

    it('shows the empty state with no bio and no links', () => {
      renderPage('anonymous', {
        initialTab: 'about',
        profile: { bio: null, links: [] },
      })

      expect(screen.getByText('Nothing here yet.')).toBeVisible()
    })
  })

  describe('sticky header', () => {
    type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void
    let notify: Callback = () => {}

    beforeEach(() => {
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(callback: Callback) {
            notify = callback
          }
          observe() {}
          disconnect() {}
        }
      )
    })

    const sticky = () =>
      document.querySelector<HTMLElement>(
        '[data-state="shown"], [data-state="hidden"]'
      )

    it('stays hidden and inert until the identity scrolls away', () => {
      renderPage('anonymous')

      expect(sticky()).toHaveAttribute('data-state', 'hidden')
      expect(sticky()).toHaveAttribute('inert')

      act(() =>
        notify([
          {
            isIntersecting: false,
            boundingClientRect: { bottom: -10 } as DOMRectReadOnly,
          },
        ])
      )
      expect(sticky()).toHaveAttribute('data-state', 'shown')
      expect(sticky()).not.toHaveAttribute('inert')
      expect(
        within(sticky() as HTMLElement).getByText('1,200 followers')
      ).toBeVisible()

      act(() =>
        notify([
          {
            isIntersecting: true,
            boundingClientRect: { bottom: 200 } as DOMRectReadOnly,
          },
        ])
      )
      expect(sticky()).toHaveAttribute('data-state', 'hidden')
    })

    it('animates only when motion is allowed', () => {
      renderPage('anonymous')

      expect(sticky()?.className).toMatch(/motion-safe:transition/)
      expect(sticky()?.className).not.toMatch(/(^|\s)transition-/)
    })

    it('switches tabs from its mini tabs', async () => {
      const user = userEvent.setup()
      renderPage('anonymous')
      act(() =>
        notify([
          {
            isIntersecting: false,
            boundingClientRect: { bottom: -10 } as DOMRectReadOnly,
          },
        ])
      )

      await user.click(
        within(sticky() as HTMLElement).getByRole('button', {
          name: 'About',
        })
      )

      expect(page().getByRole('tab', { name: 'About' })).toHaveAttribute(
        'aria-selected',
        'true'
      )
      expect(window.location.search).toBe('?tab=about')
    })
  })

  describe('collections tab (FQ-35, BE-CONT-15)', () => {
    const collections = () =>
      parseCreatorCollections(
        ok([
          rawCollection(),
          rawCollection({
            id: 8,
            title: 'Sketches',
            description: null,
            postCount: 0,
          }),
        ])
      )
    const tab = () => page().getByRole('tab', { name: /Collections/ })
    const panel = () =>
      within(screen.getByRole('tabpanel', { name: /Collections/ }))

    it('is left out when the creator has none, or they could not be read', () => {
      const { unmount } = renderPage('anonymous', { collections: [] })
      expect(page().queryByRole('tab', { name: /Collections/ })).toBeNull()
      unmount()
      renderPage('anonymous', { collections: null, initialTab: 'collections' })
      expect(page().queryByRole('tab', { name: /Collections/ })).toBeNull()
      // ?tab=collections without the tab opens Posts.
      expect(page().getByRole('tab', { name: /Posts/ })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    })

    it('lists each collection with its public count, and opens its posts as the server sent them', async () => {
      const user = userEvent.setup()
      actions.listCreatorCollectionPostsAction.mockResolvedValue({
        ok: true,
        data: postPage([rawFull(), rawTeaser(11, null)], { next: 2, total: 3 }),
      })
      renderPage('anonymous', { collections: collections() })
      await user.click(tab())
      const cards = panel().getAllByRole('listitem')
      expect(cards[0]).toHaveTextContent('Podcast')
      expect(cards[0]).toHaveTextContent('3 posts')
      expect(cards[0]).toHaveTextContent('Weekly episodes')
      expect(cards[1]).toHaveTextContent('0 posts')
      await user.click(
        page().getByRole('button', { name: 'View the posts of “Podcast”' })
      )
      expect(actions.listCreatorCollectionPostsAction).toHaveBeenCalledWith({
        creatorId: 4,
        collectionId: 7,
        page: 1,
      })
      expect(await panel().findByText(FREE_BODY)).toBeInTheDocument()
      // TEASER with no preview: only the gate, nothing of a body.
      expect(
        panel().getAllByRole('region', {
          name: "This post is for the creator's members",
        })
      ).toHaveLength(1)
      expect(panel().queryByText(OPEN_PART)).toBeNull()
      expect(panel().queryByText(PREVIEW)).toBeNull()

      actions.listCreatorCollectionPostsAction.mockResolvedValue({
        ok: true,
        data: postPage([rawPartial()], { next: null, total: 3 }),
      })
      await user.click(screen.getByRole('button', { name: 'Load more posts' }))
      expect(actions.listCreatorCollectionPostsAction).toHaveBeenLastCalledWith(
        {
          creatorId: 4,
          collectionId: 7,
          page: 2,
        }
      )
      expect(
        (await panel().findByText(OPEN_PART)).closest('.teaser-fade')
      ).not.toBeNull()

      await user.click(screen.getByRole('button', { name: 'All collections' }))
      expect(panel().getAllByRole('listitem')).toHaveLength(2)
    })

    it('shows the empty and failed states of a collection', async () => {
      const user = userEvent.setup()
      actions.listCreatorCollectionPostsAction.mockResolvedValue({
        ok: true,
        data: postPage([]),
      })
      renderPage('anonymous', {
        collections: collections(),
        initialTab: 'collections',
      })
      await user.click(
        page().getByRole('button', { name: 'View the posts of “Sketches”' })
      )
      expect(
        await screen.findByText('No published posts in this collection yet.')
      ).toBeVisible()
      await user.click(screen.getByRole('button', { name: 'All collections' }))

      actions.listCreatorCollectionPostsAction.mockResolvedValue({
        ok: false,
        status: 500,
      })
      await user.click(
        page().getByRole('button', { name: 'View the posts of “Podcast”' })
      )
      expect(
        await screen.findByText("This collection's posts couldn't be loaded.")
      ).toBeVisible()
    })

    it('says a collection deleted since the page loaded is gone, with a way back, and moves focus', async () => {
      const user = userEvent.setup()
      actions.listCreatorCollectionPostsAction.mockResolvedValue({
        ok: false,
        status: 404,
        code: 'CONTENT_COLLECTION_NOT_FOUND',
      })
      renderPage('anonymous', {
        collections: collections(),
        initialTab: 'collections',
      })
      await user.click(
        page().getByRole('button', { name: 'View the posts of “Podcast”' })
      )
      expect(
        page().getByRole('heading', { name: 'Podcast', level: 3 })
      ).toHaveFocus()
      expect(
        await screen.findByText('This collection is no longer available.')
      ).toBeVisible()
      expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
      await user.click(
        screen.getAllByRole('button', { name: 'All collections' })[0]!
      )
      expect(
        page().getByRole('button', { name: 'View the posts of “Podcast”' })
      ).toHaveFocus()
    })

    it('renders in Persian with every key present', async () => {
      const user = userEvent.setup()
      actions.listCreatorCollectionPostsAction.mockResolvedValue({
        ok: true,
        data: postPage([rawTeaser()]),
      })
      renderPage('anonymous', { collections: collections() }, 'fa')
      await user.click(page().getByRole('tab', { name: /مجموعه‌ها/ }))
      expect(page().getByText('۳ پست')).toBeInTheDocument()
      await user.click(
        page().getByRole('button', { name: 'مشاهده پست‌های «Podcast»' })
      )
      expect(await screen.findByText(PREVIEW)).toBeInTheDocument()
    })
  })

  it('opens the Tiers tab from ?tab=tiers, the post gate (FE-CONT-01)', () => {
    renderPage('anonymous', { initialTab: 'tiers' })

    expect(page().getByRole('tab', { name: /tiers/ })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByText('Supporter')).toBeVisible()
  })

  it.each([
    ['tiers', 'tiers'],
    ['collections', 'collections'],
    ['about', 'about'],
    ['posts', 'posts'],
    [undefined, 'posts'],
    ['TIERS', 'posts'],
    [['tiers', 'about'], 'posts'],
  ])('reads ?tab=%j as the %s tab', (value, tab) => {
    expect(creatorPageTab(value)).toBe(tab)
  })
})
