import { describe, expect, it } from 'vitest'

import {
  InvalidCreatorPageResponseError,
  creatorIdSchema,
  parseCreatorPostPage,
  parseCreatorProfile,
  parseCreatorTiers,
  parseOwnCreatorPage,
} from './creator-page'
import {
  FREE_BODY,
  OPEN_PART,
  PREVIEW,
  ok,
  rawFull,
  rawPartial,
  rawPostPage,
  rawTeaser,
} from '../test/fixtures'

const envelope = (data: unknown) => ({ data, errors: null })

// BE-LAND-03 shapes — keep in step with back-end/docs/modules/landing/api.md.
const profile = {
  id: 4,
  alias: 'dana',
  pageName: 'Dana Atelier',
  avatar: 'https://cdn.fellowa.test/a.png',
  header: 'avatars/4/h.png',
  about: {
    bio: 'Painter',
    videoUrl: null,
    facebookLink: 'javascript:alert(1)',
    instagramLink: 'https://instagram.com/dana',
    twitterLink: null,
    youtubeLink: 'https://youtube.com/@dana',
  },
  categoryId: 2,
  numFollowers: '12',
  viewer: null,
}

describe('creator page responses (FE-PAGE-01)', () => {
  it('maps the profile and keeps only absolute http(s) links and images', () => {
    expect(parseCreatorProfile(envelope(profile))).toEqual({
      id: 4,
      alias: 'dana',
      pageName: 'Dana Atelier',
      avatarUrl: 'https://cdn.fellowa.test/a.png',
      coverUrl: null,
      bio: 'Painter',
      categoryId: 2,
      followerCount: 12,
      links: [
        { kind: 'instagram', url: 'https://instagram.com/dana' },
        { kind: 'youtube', url: 'https://youtube.com/@dana' },
      ],
      viewerFollows: null,
    })
  })

  it.each([
    [{ isFollowing: true }, true],
    [{ isFollowing: false }, false],
    [null, null],
    [undefined, null], // a backend before BE-LAND-09 sends no `viewer` at all
  ])('maps the viewer state %j (BE-LAND-09)', (viewer, viewerFollows) => {
    expect(parseCreatorProfile(envelope({ ...profile, viewer }))).toMatchObject(
      { viewerFollows }
    )
  })

  it.each([
    ['a string', 'Dana Atelier', 'Dana Atelier'],
    ['null', null, null],
    ['missing', undefined, null],
  ])('maps a page name that is %s (BE-USER-07)', (_name, pageName, mapped) => {
    expect(
      parseCreatorProfile(envelope({ ...profile, pageName }))
    ).toMatchObject({ pageName: mapped })
  })

  it('refuses a page name that is not a string', () => {
    expect(() =>
      parseCreatorProfile(envelope({ ...profile, pageName: 7 }))
    ).toThrow(InvalidCreatorPageResponseError)
  })

  it('accepts a profile without an about record', () => {
    expect(
      parseCreatorProfile(envelope({ ...profile, about: null }))
    ).toMatchObject({ bio: null, links: [] })
  })

  it('parses tier prices as integer Toman and refuses anything else', () => {
    const tier = {
      id: 7,
      title: 'Supporter',
      description: null,
      price: '50000',
      cover: null,
      benefits: [{ id: 2, title: 'Early posts' }],
    }
    expect(parseCreatorTiers(envelope([tier]))).toEqual([
      {
        id: 7,
        title: 'Supporter',
        description: null,
        priceToman: 50000,
        coverUrl: null,
        benefits: [{ id: 2, title: 'Early posts' }],
      },
    ])
    for (const price of ['50000.5', '-1', 'free']) {
      expect(() => parseCreatorTiers(envelope([{ ...tier, price }]))).toThrow(
        InvalidCreatorPageResponseError
      )
    }
  })

  describe('the public post list (Q-51, FE-PAGE-03)', () => {
    it("keeps only each level's keys and the page", () => {
      const page = parseCreatorPostPage(
        ok(
          rawPostPage([rawFull(), rawPartial(), rawTeaser()], {
            total: 41,
            next: 2,
          })
        ),
        4
      )

      expect(page).toEqual({
        total: 41,
        nextPage: 2,
        items: [
          {
            id: 9,
            title: 'Hello world',
            createdAt: '2026-10-30T10:00:00.000Z',
            access: 'FULL',
            body: { format: 'plain', text: FREE_BODY },
          },
          {
            id: 10,
            title: 'Half open',
            createdAt: '2026-10-30T10:00:00.000Z',
            access: 'PARTIAL',
            body: { format: 'plain', text: OPEN_PART },
          },
          {
            id: 11,
            title: 'Members video',
            createdAt: '2026-10-30T10:00:00.000Z',
            access: 'TEASER',
            textPreview: PREVIEW,
          },
        ],
      })
    })

    it('drops a body a gated level should not carry', () => {
      const page = parseCreatorPostPage(
        ok(rawPostPage([{ ...rawTeaser(), text: 'LEAKEDBODY' }])),
        4
      )

      expect(JSON.stringify(page)).not.toContain('LEAKEDBODY')
    })

    it('reads an absent opening or preview as null', () => {
      const page = parseCreatorPostPage(
        ok(rawPostPage([rawPartial(10, null), rawTeaser(11, null)])),
        4
      )

      expect(page.items).toMatchObject([
        { access: 'PARTIAL', body: null },
        { access: 'TEASER', textPreview: null },
      ])
    })

    it('reads an html body only when the server says html (BE-CONT-14)', () => {
      const html = '<p dir="auto">باز</p>'
      const page = parseCreatorPostPage(
        ok(
          rawPostPage([
            { ...rawPartial(10, html), bodyFormat: 'html' },
            { ...rawFull(), text: html, bodyFormat: 'plain' },
            { ...rawTeaser(), bodyFormat: 'html', text: 'LEAKEDBODY' },
          ])
        ),
        4
      )
      expect(page.items).toMatchObject([
        { access: 'PARTIAL', body: { format: 'html', html } },
        { access: 'FULL', body: { format: 'plain', text: html } },
        { access: 'TEASER' },
      ])
      expect(JSON.stringify(page)).not.toContain('LEAKEDBODY')
    })

    it.each([
      ['DENY level', { ...rawFull(), access: 'DENY' }],
      ['missing creatorId', { ...rawFull(), creatorId: undefined }],
      ['another creator', { ...rawFull(), creatorId: 5 }],
    ])('refuses an item with a %s', (_name, item) => {
      expect(() => parseCreatorPostPage(ok(rawPostPage([item])), 4)).toThrow(
        InvalidCreatorPageResponseError
      )
    })
  })

  it.each([
    ['12', true],
    ['0', false],
    ['-3', false],
    ['1.5', false],
    ['abc', false],
  ])('creator id %j valid: %j', (raw, ok) => {
    expect(creatorIdSchema.safeParse(raw).success).toBe(ok)
  })
})

describe("the owner's preview response (BE-LAND-10)", () => {
  it('reads GET /landing/me/page: the public shape plus isPublished', () => {
    const own = parseOwnCreatorPage(
      envelope({ ...profile, viewer: null, isPublished: false })
    )
    expect(own).toEqual({
      profile: parseCreatorProfile(envelope(profile)),
      isPublished: false,
    })
    expect(
      parseOwnCreatorPage(envelope({ ...profile, isPublished: true }))
        .isPublished
    ).toBe(true)
  })

  it('refuses an answer without a boolean isPublished', () => {
    expect(() => parseOwnCreatorPage(envelope(profile))).toThrow(
      InvalidCreatorPageResponseError
    )
    expect(() =>
      parseOwnCreatorPage(envelope({ ...profile, isPublished: 'yes' }))
    ).toThrow(InvalidCreatorPageResponseError)
  })
})
