import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { CreatorPageViewer } from '@/features/creator-page/server/load-creator-page'
import type {
  CreatorPost,
  CreatorProfile,
  CreatorTier,
} from '@/features/creator-page/types/creator-page'
import { renderWithIntl } from '../../../../test/render'
import { CreatorPageView } from './creator-page-view'

const profile: CreatorProfile = {
  id: 4,
  alias: 'dana',
  avatarUrl: null,
  coverUrl: null,
  bio: 'Painter of small things',
  categoryId: 2,
  followerCount: 1200,
  links: [{ kind: 'instagram', url: 'https://instagram.com/dana' }],
}
const tiers: CreatorTier[] = [
  {
    id: 7,
    title: 'Supporter',
    description: 'Monthly support',
    priceToman: 50000,
    coverUrl: null,
    benefits: [{ id: 2, title: 'Early posts' }],
  },
]
const posts: CreatorPost[] = [
  {
    id: 9,
    title: 'Hello world',
    text: 'First post',
    tags: [],
    createdAt: '2026-10-30T10:00:00.000Z',
  },
]

function renderPage(
  viewer: CreatorPageViewer,
  overrides: { tiers?: CreatorTier[] | null; posts?: CreatorPost[] } = {},
  locale: 'fa' | 'en' = 'en'
) {
  return renderWithIntl(
    <CreatorPageView
      profile={profile}
      tiers={overrides.tiers === undefined ? tiers : overrides.tiers}
      posts={overrides.posts ?? posts}
      categoryTitle="Music"
      viewer={viewer}
    />,
    { locale }
  )
}

describe('CreatorPageView (FE-PAGE-01)', () => {
  it('shows the identity, category, follower count and public posts', () => {
    renderPage('anonymous')

    expect(
      screen.getByRole('heading', { level: 1, name: 'dana' })
    ).toBeVisible()
    expect(screen.getByText('Music').closest('p')).toHaveTextContent(
      /^Music\s*·\s*1,200 followers$/
    )
    expect(screen.getByRole('heading', { name: 'Hello world' })).toBeVisible()
  })

  it('sends an anonymous visitor to sign in and back to this page', async () => {
    const user = userEvent.setup()
    renderPage('anonymous')

    for (const name of ['Follow', 'Support']) {
      const link = screen.getByRole('link', { name })
      expect(link.getAttribute('href')).toMatch(
        /\/auth\/login\?returnTo=%2Fcreators%2F4$/
      )
    }
    await user.click(screen.getByRole('tab', { name: /Tiers/ }))
    expect(
      screen.getByRole('link', { name: 'Join this tier' }).getAttribute('href')
    ).toMatch(/\/auth\/login\?returnTo=%2Fcreators%2F4$/)
  })

  it('shows a signed-in visitor the actions as not yet available', () => {
    renderPage('signedIn')

    expect(screen.getByRole('button', { name: 'Follow' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Support' })).toBeDisabled()
    expect(
      screen.getByText('Following and joining open soon.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Follow' })).toBeNull()
  })

  it('offers the owner an edit link and no self-follow or self-join', async () => {
    const user = userEvent.setup()
    renderPage('owner')

    expect(
      screen.getByRole('link', { name: 'Edit your page' }).getAttribute('href')
    ).toMatch(/\/studio\/page$/)
    expect(screen.queryByRole('button', { name: 'Follow' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Follow' })).toBeNull()
    await user.click(screen.getByRole('tab', { name: /Tiers/ }))
    expect(screen.queryByText('Join this tier')).toBeNull()
  })

  it('prices a tier in Toman with the unit attached', async () => {
    const user = userEvent.setup()
    renderPage('anonymous')

    await user.click(screen.getByRole('tab', { name: /Tiers/ }))
    const card = screen
      .getByRole('heading', { name: 'Supporter' })
      .closest('div')
    expect(card).not.toBeNull()
    expect(
      within(card as HTMLElement)
        .getByText('50,000')
        .closest('p')
    ).toHaveTextContent('50,000 Toman')
  })

  it('uses Persian digits and the Persian unit in fa', async () => {
    const user = userEvent.setup()
    renderPage('anonymous', {}, 'fa')

    await user.click(screen.getByRole('tab', { name: /پلن/ }))
    expect(screen.getByText('۵۰٬۰۰۰').closest('p')).toHaveTextContent(
      '۵۰٬۰۰۰ تومان'
    )
  })

  it('opens social links in a new tab without passing the referrer', async () => {
    const user = userEvent.setup()
    renderPage('anonymous')

    await user.click(screen.getByRole('tab', { name: 'About' }))
    const link = screen.getByRole('link', { name: /Instagram/ })
    expect(link).toHaveAttribute('href', 'https://instagram.com/dana')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc')
  })

  it('shows empty states when there are no posts or tiers', async () => {
    const user = userEvent.setup()
    renderPage('anonymous', { tiers: [], posts: [] })

    expect(screen.getByText('No public posts yet.')).toBeVisible()
    await user.click(screen.getByRole('tab', { name: /Tiers/ }))
    expect(screen.getByText('No tiers yet.')).toBeVisible()
  })

  it('dates posts in Tehran time (owner decision 2026-10-30)', () => {
    // 22:00 UTC on the 30th is 01:30 on the 31st in Tehran (UTC+3:30).
    renderPage('anonymous', {
      posts: [{ ...posts[0], createdAt: '2026-10-30T22:00:00.000Z' }],
    })

    expect(screen.getByText('Oct 31, 2026')).toHaveAttribute(
      'dateTime',
      '2026-10-30T22:00:00.000Z'
    )
  })

  it('keeps the page when only the tier list failed', async () => {
    const user = userEvent.setup()
    renderPage('anonymous', { tiers: null })

    expect(
      screen.getByRole('heading', { level: 1, name: 'dana' })
    ).toBeVisible()
    await user.click(screen.getByRole('tab', { name: 'Tiers' }))
    expect(
      screen.getByText("Tiers couldn't be loaded. Try again later.")
    ).toBeVisible()
  })

  it('explains the disabled join buttons to a signed-in visitor', async () => {
    const user = userEvent.setup()
    renderPage('signedIn')

    await user.click(screen.getByRole('tab', { name: /Tiers/ }))
    const panel = screen.getByRole('tabpanel')
    expect(
      within(panel).getByRole('button', { name: 'Join this tier' })
    ).toBeDisabled()
    expect(
      within(panel).getByText('Following and joining open soon.')
    ).toBeVisible()
  })
})
