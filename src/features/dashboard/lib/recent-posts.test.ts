import { describe, expect, it } from 'vitest'

import type { DashboardPost } from '@/features/dashboard/types/dashboard'
import { postBodyFromApi } from '@/lib/post-body'

import {
  DEFAULT_FEED_FILTERS,
  type FeedFilters,
  filterFeed,
  hasActiveFeedFilters,
  isLongBody,
} from './recent-posts'

function post(overrides: Partial<DashboardPost> = {}): DashboardPost {
  return {
    id: 1,
    title: 'Hello',
    body: null,
    excerpt: null,
    publishedAt: '2026-11-20T08:00:00.000Z',
    createdAt: '2026-11-19T08:00:00.000Z',
    audience: 'public',
    ...overrides,
  }
}

const filters = (over: Partial<FeedFilters>): FeedFilters => ({
  ...DEFAULT_FEED_FILTERS,
  ...over,
})
const ids = (posts: DashboardPost[]) => posts.map((p) => p.id)

describe('filterFeed', () => {
  const posts = [
    post({ id: 1, title: 'Studio tour', audience: 'public' }),
    post({
      id: 2,
      title: 'Gold notes',
      audience: 'tiers',
      body: postBodyFromApi('Behind the scenes', 'plain'),
      publishedAt: '2026-11-21T08:00:00.000Z',
    }),
    post({
      id: 3,
      title: 'Teaser',
      audience: 'paywalled',
      body: postBodyFromApi('<p>secret <strong>mix</strong></p>', 'html'),
      excerpt: 'secret mix',
      publishedAt: null,
      createdAt: '2026-11-22T08:00:00.000Z',
    }),
  ]

  it('sorts by the shown date, newest first by default, and oldest on request', () => {
    expect(ids(filterFeed(posts, DEFAULT_FEED_FILTERS, 'en'))).toEqual([
      3, 2, 1,
    ])
    expect(ids(filterFeed(posts, filters({ sort: 'oldest' }), 'en'))).toEqual([
      1, 2, 3,
    ])
  })

  it('searches the title, a plain body and the server excerpt, ignoring case', () => {
    expect(ids(filterFeed(posts, filters({ query: 'STUDIO' }), 'en'))).toEqual([
      1,
    ])
    expect(ids(filterFeed(posts, filters({ query: 'scenes' }), 'en'))).toEqual([
      2,
    ])
    expect(
      ids(filterFeed(posts, filters({ query: ' secret mix ' }), 'en'))
    ).toEqual([3])
  })

  it('finds a word deep in an html body, past its excerpt', () => {
    const deep = post({
      id: 4,
      body: postBodyFromApi(
        `<p>${'intro '.repeat(60)}</p><p>the final mixing</p>`,
        'html'
      ),
      excerpt: 'intro '.repeat(33).trim(),
    })
    expect(ids(filterFeed([deep], filters({ query: 'mixing' }), 'en'))).toEqual(
      [4]
    )
  })

  it('never matches an html body’s markup', () => {
    expect(ids(filterFeed(posts, filters({ query: 'strong' }), 'en'))).toEqual(
      []
    )
  })

  it('splits free and members as /posts does: a paywalled post is free', () => {
    expect(ids(filterFeed(posts, filters({ audience: 'free' }), 'en'))).toEqual(
      [3, 1]
    )
    expect(
      ids(filterFeed(posts, filters({ audience: 'members' }), 'en'))
    ).toEqual([2])
  })

  it('matches Persian text', () => {
    const fa = [post({ id: 9, title: 'پشت صحنه ضبط' })]
    expect(ids(filterFeed(fa, filters({ query: 'صحنه' }), 'fa'))).toEqual([9])
  })

  it('does not change the list it was given', () => {
    const copy = [...posts]
    filterFeed(posts, filters({ sort: 'oldest' }), 'en')
    expect(posts).toEqual(copy)
  })
})

describe('hasActiveFeedFilters', () => {
  it('counts a query or an audience, not the sort', () => {
    expect(hasActiveFeedFilters(DEFAULT_FEED_FILTERS)).toBe(false)
    expect(hasActiveFeedFilters(filters({ sort: 'oldest' }))).toBe(false)
    expect(hasActiveFeedFilters(filters({ query: '  ' }))).toBe(false)
    expect(hasActiveFeedFilters(filters({ query: 'x' }))).toBe(true)
    expect(hasActiveFeedFilters(filters({ audience: 'members' }))).toBe(true)
  })
})

describe('isLongBody', () => {
  it('is short for a few lines of plain text', () => {
    expect(isLongBody({ format: 'plain', text: 'one\ntwo' })).toBe(false)
  })

  it('is long past six lines or about six lines of text', () => {
    expect(isLongBody({ format: 'plain', text: 'a\nb\nc\nd\ne\nf\ng' })).toBe(
      true
    )
    expect(isLongBody({ format: 'plain', text: 'word '.repeat(100) })).toBe(
      true
    )
  })

  it('counts an html body’s blocks and text, not its markup', () => {
    const short = postBodyFromApi(
      '<p><a href="https://example.com/a/very/long/link/that/is/only/markup">x</a></p>',
      'html'
    )
    const many = postBodyFromApi('<p>a</p>'.repeat(7), 'html')
    expect(short && isLongBody(short)).toBe(false)
    expect(many && isLongBody(many)).toBe(true)
  })
})
