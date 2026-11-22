import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { CreatorByline } from '@/features/creator-page/server'
import type { ReaderPost } from '@/features/post-reader/types/reader-post'
import { renderWithIntl } from '../../../../test/render'
import { parseReaderPost } from '../schemas/reader-post'
import {
  BODY,
  OPEN_PART,
  PREVIEW,
  ok,
  rawFullMember,
  rawFullPublic,
  rawPartial,
  rawTeaser,
} from '../test/fixtures'
import { PostReaderSkeleton } from './post-reader-skeleton'
import { PostReaderView } from './post-reader-view'

const fromRaw = (raw: unknown): ReaderPost => parseReaderPost(ok(raw))

const byline: CreatorByline = {
  id: 4,
  pageName: 'Dana Atelier',
  alias: 'dana',
  avatarUrl: null,
}

function renderPost(
  raw: unknown,
  viewer: 'anonymous' | 'signedIn' = 'anonymous',
  locale: 'fa' | 'en' = 'en',
  creator: CreatorByline | null = byline
) {
  return renderWithIntl(
    <PostReaderView
      creatorId={4}
      post={fromRaw(raw)}
      viewer={viewer}
      creator={creator}
    />,
    { locale, strict: true }
  )
}

const gateLink = () => screen.queryByRole('link', { name: 'See the tiers' })

describe('PostReaderView (FE-CONT-01)', () => {
  it('FULL: the whole body, its media and no gate', () => {
    const { container } = renderPost(rawFullPublic())

    expect(
      screen.getByRole('heading', { level: 1, name: 'A title' })
    ).toBeVisible()
    expect(screen.getByText(BODY)).toBeVisible()
    expect(screen.getByRole('img', { name: 'Image 1' })).toHaveAttribute(
      'src',
      'https://cdn.test/IMAGEKEY.png'
    )
    expect(
      screen.getByText('This post has a video. Playback here opens soon.')
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'https://link.test/page' })
    ).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc')
    expect(screen.getByRole('link', { name: 'Attachment 1' })).toHaveAttribute(
      'href',
      'https://cdn.test/FILEKEY.pdf'
    )
    expect(gateLink()).toBeNull()
    expect(screen.queryByText('Members only')).toBeNull()
    expect(screen.queryByRole('separator')).toBeNull()
    expect(container).not.toHaveTextContent(PREVIEW)
  })

  it('FULL for a member: the poll options, read-only', () => {
    renderPost(rawFullMember(), 'signedIn')

    expect(screen.getByRole('heading', { name: 'Poll' })).toBeVisible()
    expect(screen.getByText('POLLOPTION one')).toBeVisible()
    expect(screen.getByText('POLLOPTION two')).toBeVisible()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('PARTIAL: the opening, the divider and the gate, and nothing past it', () => {
    const { container } = renderPost(rawPartial())

    expect(screen.getByText(OPEN_PART)).toBeVisible()
    expect(
      screen.getByRole('separator', {
        name: 'The rest of this post is open to members only',
      })
    ).toBeVisible()
    expect(screen.getByText('Members only')).toBeVisible()
    expect(gateLink()).toBeVisible()
    expect(container).not.toHaveTextContent(BODY)
    expect(container).not.toHaveTextContent('POLLOPTION')
    expect(container.querySelector('img')).toBeNull()
  })

  it('PARTIAL at position 0: the divider and gate with no text', () => {
    const { container } = renderPost(rawPartial(null))

    expect(screen.getByRole('separator')).toBeVisible()
    expect(gateLink()).toBeVisible()
    expect(container).not.toHaveTextContent(OPEN_PART)
  })

  it('TEASER: the owner preview, faded, and the gate; no body', () => {
    const { container } = renderPost(rawTeaser())

    const preview = screen.getByText(PREVIEW)
    expect(preview.closest('.teaser-fade')).not.toBeNull()
    expect(
      screen.getByRole('heading', {
        name: "This post is for the creator's members",
      })
    ).toBeVisible()
    expect(gateLink()).toBeVisible()
    expect(screen.queryByRole('separator')).toBeNull()
    expect(container).not.toHaveTextContent(BODY)
    expect(container.querySelector('img')).toBeNull()
  })

  it('TEASER without a preview: only the gate', () => {
    const { container } = renderPost(rawTeaser(null))

    expect(gateLink()).toBeVisible()
    expect(container.querySelector('.teaser-fade')).toBeNull()
  })

  it('never renders a gated key a TEASER response should not hold', () => {
    const { container } = renderPost({
      ...rawTeaser(),
      text: 'GATEDTEXT',
      images: [{ id: 1, url: 'https://cdn.test/GATED.png' }],
    })

    expect(container.innerHTML).not.toMatch(/GATED/)
  })

  it('the gate leads to the Tiers tab, never to a purchase (FQ-31)', () => {
    renderPost(rawTeaser())

    expect(gateLink()?.getAttribute('href')).toMatch(
      /\/creators\/4\?tab=tiers$/
    )
    expect(screen.queryByText(/buy|purchase/i)).toBeNull()
  })

  it('offers an anonymous visitor sign-in back to this post (FQ-33 A)', () => {
    renderPost(rawTeaser(), 'anonymous')

    expect(
      screen
        .getByRole('link', { name: 'Already a member? Sign in' })
        .getAttribute('href')
    ).toMatch(/\/auth\?returnTo=%2Fcreators%2F4%2Fposts%2F31$/)
  })

  it('offers no sign-in to a signed-in viewer the server still gates', () => {
    renderPost(rawPartial(), 'signedIn')

    expect(gateLink()).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'Already a member? Sign in' })
    ).toBeNull()
  })

  it('links back to the creator page', () => {
    renderPost(rawFullPublic())

    expect(
      screen
        .getByRole('link', { name: "Back to the creator's page" })
        .getAttribute('href')
    ).toMatch(/\/creators\/4$/)
  })

  it('renders the gate in Persian with every key present', () => {
    renderPost(rawPartial(), 'anonymous', 'fa')

    expect(
      screen.getByRole('separator', {
        name: 'ادامهٔ این پست فقط برای اعضا باز است',
      })
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'مشاهدهٔ پلن‌ها' })).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'عضو هستید؟ وارد شوید' })
    ).toBeVisible()
  })

  it('renders FULL media copy in Persian with every key present', () => {
    renderPost(rawFullMember(), 'signedIn', 'fa')

    expect(screen.getByRole('heading', { name: 'نظرسنجی' })).toBeVisible()
    expect(screen.getByRole('img', { name: 'تصویر ۱' })).toBeVisible()
  })

  it('says when audio is still processing', () => {
    renderPost({
      ...rawFullPublic(),
      audios: [{ ...rawFullPublic().audios[0], status: false }],
    })

    expect(
      screen.getByText("This post's audio is still being processed.")
    ).toBeVisible()
  })
})

describe('PostReaderSkeleton (FE-CONT-01 loading)', () => {
  it.each(['en', 'fa'] as const)('announces loading in %s', (locale) => {
    renderWithIntl(<PostReaderSkeleton />, { locale, strict: true })

    expect(screen.getByRole('status')).toHaveAccessibleName(
      locale === 'en' ? 'Loading…' : /.+/
    )
  })

  describe('byline (BE-CONT-13)', () => {
    it("links the creator page's public name", () => {
      renderPost(rawTeaser())

      expect(
        screen.getByRole('link', { name: /Dana Atelier/ }).getAttribute('href')
      ).toMatch(/\/creators\/4$/)
    })

    it('falls back to @alias, then to the unnamed copy, in fa', () => {
      const { unmount } = renderPost(rawTeaser(), 'anonymous', 'fa', {
        ...byline,
        pageName: null,
      })
      expect(screen.getByRole('link', { name: /@dana/ })).toBeVisible()
      unmount()

      renderPost(rawTeaser(), 'anonymous', 'fa', {
        ...byline,
        pageName: null,
        alias: null,
      })
      expect(screen.getByRole('link', { name: /کریتور بی‌نام/ })).toBeVisible()
    })

    it('renders no byline when the profile was not read', () => {
      renderPost(rawFullPublic(), 'anonymous', 'en', null)

      expect(screen.queryByRole('link', { name: /Dana Atelier/ })).toBeNull()
    })
  })
})
