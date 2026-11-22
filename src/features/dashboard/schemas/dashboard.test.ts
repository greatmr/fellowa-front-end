import { describe, expect, it } from 'vitest'

import {
  InvalidDashboardResponseError,
  parseDashboardPosts,
  parseHasPayoutDetails,
  parseHasRows,
  parseProfile,
} from '@/features/dashboard/schemas/dashboard'

const envelope = (data: unknown) => ({ data, errors: null })

/** `GET /user/:id/profile`, owner shape (`toSelfProfile`). */
function profile(overrides: Record<string, unknown> = {}) {
  return envelope({
    id: 42,
    email: 'me@example.com',
    alias: 'sara',
    pageName: null,
    displayName: 'Sara',
    isVerified: true,
    isPublish: false,
    hasPassword: true,
    categoryId: null,
    personal: { phoneNumber: '09121234567' },
    about: null,
    images: { profile: null, header: null },
    ...overrides,
  })
}

describe('parseProfile', () => {
  it('keeps what the dashboard shows and drops personal data', () => {
    const parsed = parseProfile(
      profile({
        alias: ' sara ',
        pageName: ' Sara Atelier ',
        isPublish: true,
        images: {
          profile: 'https://cdn.fellowa.test/profile/1.jpg',
          header: 'https://cdn.fellowa.test/header/1.jpg',
        },
      })
    )

    expect(parsed).toEqual({
      username: 'sara',
      isPublished: true,
      hasProfileImages: true,
      identity: {
        pageName: 'Sara Atelier',
        displayName: 'Sara',
        alias: 'sara',
        avatarUrl: 'https://cdn.fellowa.test/profile/1.jpg',
      },
    })
    expect(JSON.stringify(parsed)).not.toContain('0912')
    expect(JSON.stringify(parsed)).not.toContain('me@example.com')
  })

  it('treats a missing or blank alias as no username', () => {
    expect(parseProfile(profile({ alias: null })).username).toBeNull()
    expect(parseProfile(profile({ alias: '  ' })).username).toBeNull()
  })

  it('needs both a profile photo and a cover for step 1', () => {
    const only = (images: unknown) =>
      parseProfile(profile({ images })).hasProfileImages
    expect(only({ profile: 'https://cdn.test/a.jpg', header: null })).toBe(
      false
    )
    expect(only({ profile: null, header: 'https://cdn.test/b.jpg' })).toBe(
      false
    )
    expect(
      only({
        profile: 'https://cdn.test/a.jpg',
        header: 'https://cdn.test/b.jpg',
      })
    ).toBe(true)
  })

  it('counts a stored key without a usable URL as set, but shows no avatar', () => {
    // Storage unconfigured: `buildUrl` returns the bare key (FE-TIER-04 §5).
    const parsed = parseProfile(
      profile({
        images: {
          profile: 'patreon/profile/1.jpg',
          header: 'patreon/header/1.jpg',
        },
      })
    )
    expect(parsed.hasProfileImages).toBe(true)
    expect(parsed.identity.avatarUrl).toBeNull()
  })

  it('rejects a response without the publish flag', () => {
    expect(() => parseProfile(envelope({ alias: 'sara' }))).toThrow(
      InvalidDashboardResponseError
    )
  })
})

describe('parseHasRows / parseHasPayoutDetails', () => {
  it('is true only for a non-empty list', () => {
    expect(parseHasRows(envelope([]))).toBe(false)
    expect(parseHasRows(envelope([{ id: 7, title: 'Gold' }]))).toBe(true)
  })

  it('rejects a list that is not one', () => {
    expect(() => parseHasRows(envelope({ id: 7 }))).toThrow(
      InvalidDashboardResponseError
    )
  })

  it('needs a non-blank IBAN', () => {
    expect(parseHasPayoutDetails(envelope({ ibanNumber: 'IR1234' }))).toBe(true)
    expect(parseHasPayoutDetails(envelope({ ibanNumber: ' ' }))).toBe(false)
    expect(parseHasPayoutDetails(envelope({ ibanNumber: null }))).toBe(false)
  })
})

describe('parseDashboardPosts', () => {
  it('maps a draft and a tier-only post from their visibility', () => {
    expect(
      parseDashboardPosts(
        envelope([
          {
            id: 3,
            type: 'text',
            title: 'Draft',
            text: 'Body',
            bodyFormat: 'plain',
            excerpt: 'Body',
            creatorId: 42,
            collectionIds: [],
            visibility: { contentId: 3, type: false, datePublished: null },
            createdAt: '2026-11-21T08:00:00.000Z',
            access: 'FULL',
          },
        ])
      )
    ).toEqual([
      {
        id: 3,
        title: 'Draft',
        body: { format: 'plain', text: 'Body' },
        excerpt: 'Body',
        publishedAt: null,
        createdAt: '2026-11-21T08:00:00.000Z',
        audience: 'tiers',
      },
    ])
  })

  it('keeps the whole plain body, and has none for an empty or missing one', () => {
    const long = 'line one\nline two '.repeat(40)
    const item = (text: string | null | undefined) => ({
      id: 5,
      title: 'Post',
      text,
      createdAt: '2026-11-21T08:00:00.000Z',
      visibility: { contentId: 5, type: true, datePublished: null },
    })
    expect(
      parseDashboardPosts(
        envelope([item(long), item('   '), item(null), item(undefined)])
      ).map((post) => post.body)
    ).toEqual([{ format: 'plain', text: long }, null, null, null])
  })

  it('keeps an html body as the API sent it, with the server’s excerpt (BE-CONT-14)', () => {
    const html = '<h2>Title</h2><p>one <strong>two</strong></p>'
    const item = (over: Record<string, unknown>) => ({
      id: 7,
      title: 'Rich',
      text: html,
      bodyFormat: 'html',
      createdAt: '2026-11-21T08:00:00.000Z',
      visibility: { contentId: 7, type: true, datePublished: null },
      ...over,
    })
    const [rich, noExcerpt, plain] = parseDashboardPosts(
      envelope([
        item({ excerpt: '  Title one two ' }),
        item({}),
        item({ bodyFormat: 'plain', text: '<b>not markup</b>', excerpt: null }),
      ])
    )
    expect(rich).toMatchObject({
      body: { format: 'html', html },
      excerpt: 'Title one two',
    })
    expect(noExcerpt?.excerpt).toBeNull()
    // A plain body is text even when it looks like markup.
    expect(plain?.body).toEqual({ format: 'plain', text: '<b>not markup</b>' })
  })

  it('tells a public post with a paywall from a fully public one', () => {
    const item = (paywallPosition: number | null) => ({
      id: 4,
      title: 'Open',
      createdAt: '2026-11-21T08:00:00.000Z',
      paywallPosition,
      visibility: {
        contentId: 4,
        type: true,
        datePublished: '2026-11-21T08:00:00.000Z',
      },
    })
    expect(
      parseDashboardPosts(envelope([item(null), item(300)])).map(
        (post) => post.audience
      )
    ).toEqual(['public', 'paywalled'])
  })

  it('rejects an item without a visibility', () => {
    expect(() =>
      parseDashboardPosts(
        envelope([{ id: 3, title: 'x', createdAt: '2026-11-21T08:00:00Z' }])
      )
    ).toThrow(InvalidDashboardResponseError)
  })
})
