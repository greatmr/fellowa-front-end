import { describe, expect, it } from 'vitest'

import { ownerPost } from '../test/fixtures'
import {
  defaultListFilters,
  effectiveFilters,
  filterPosts,
  hasActiveFilters,
  searchableText,
  snippetOf,
  tabCounts,
} from './post-list'

const posts = [
  ownerPost({ id: 1, title: 'Banana', createdAt: '2026-11-01T00:00:00Z' }),
  ownerPost({
    id: 2,
    title: 'apple',
    text: 'secret recipe',
    isPublic: false,
    publishedAt: null,
    createdAt: '2026-11-03T00:00:00Z',
  }),
  ownerPost({ id: 3, title: 'Cherry', createdAt: '2026-11-02T00:00:00Z' }),
]
const ids = (list: { id: number }[]) => list.map((post) => post.id)

describe('posts list, client side over GET /content', () => {
  it('counts the three tabs from the list', () => {
    expect(tabCounts(posts)).toEqual({ all: 3, published: 2, draft: 1 })
  })

  it('filters by tab and sorts newest first', () => {
    expect(ids(filterPosts(posts, 'all', defaultListFilters, 'en'))).toEqual([
      2, 3, 1,
    ])
    expect(ids(filterPosts(posts, 'draft', defaultListFilters, 'en'))).toEqual([
      2,
    ])
    expect(
      ids(filterPosts(posts, 'published', defaultListFilters, 'en'))
    ).toEqual([3, 1])
  })

  it('searches title and text, filters free or locked, and sorts by title', () => {
    const search = { ...defaultListFilters, query: ' RECIPE ' }
    expect(ids(filterPosts(posts, 'all', search, 'en'))).toEqual([2])
    const free = { ...defaultListFilters, access: 'free' as const }
    expect(ids(filterPosts(posts, 'all', free, 'en'))).toEqual([3, 1])
    const locked = { ...defaultListFilters, access: 'locked' as const }
    expect(ids(filterPosts(posts, 'all', locked, 'en'))).toEqual([2])
    const byTitle = { ...defaultListFilters, sort: 'title' as const }
    expect(ids(filterPosts(posts, 'all', byTitle, 'en'))).toEqual([2, 1, 3])
  })

  it('treats search and access as filters, sort not', () => {
    expect(hasActiveFilters(defaultListFilters)).toBe(false)
    expect(hasActiveFilters({ ...defaultListFilters, sort: 'title' })).toBe(
      false
    )
    expect(hasActiveFilters({ ...defaultListFilters, query: 'x' })).toBe(true)
    expect(hasActiveFilters({ ...defaultListFilters, access: 'free' })).toBe(
      true
    )
  })

  it('filters by one collection or by posts in none (BE-CONT-15 collectionIds)', () => {
    const list = [
      ownerPost({ id: 1, collectionIds: [5] }),
      ownerPost({ id: 2, collectionIds: [5, 6] }),
      ownerPost({ id: 3, collectionIds: [] }),
    ]
    const by = (collection: 'none' | number) =>
      ids(filterPosts(list, 'all', { ...defaultListFilters, collection }, 'en'))
    expect(by(5).sort()).toEqual([1, 2])
    expect(by(6)).toEqual([2])
    expect(by('none')).toEqual([3])
    expect(
      hasActiveFilters({ ...defaultListFilters, collection: 'none' })
    ).toBe(true)
  })

  it('drops a collection filter whose collection is gone', () => {
    const filters = { ...defaultListFilters, collection: 7 }
    expect(effectiveFilters(filters, [7, 8])).toBe(filters)
    expect(effectiveFilters(filters, [8]).collection).toBe('all')
    const none = { ...defaultListFilters, collection: 'none' as const }
    expect(effectiveFilters(none, [])).toBe(none)
  })

  it('cuts the snippet in code points', () => {
    expect(snippetOf('  ')).toBe(null)
    const long = '😀'.repeat(200)
    expect(snippetOf(long)).toBe(`${'😀'.repeat(160)}…`)
  })
})

describe('html bodies in the list (BE-CONT-14 excerpt)', () => {
  const html = ownerPost({
    id: 9,
    title: 'Rich',
    text: '<p>hidden <strong>markup</strong></p><p>class</p>',
    bodyFormat: 'html',
    excerpt: 'hidden markup class',
  })

  it('searches and shows the server’s excerpt, never the markup', () => {
    expect(searchableText(html)).toBe('hidden markup class')
    expect(snippetOf(searchableText(html))).toBe('hidden markup class')
    const find = (query: string) =>
      ids(filterPosts([html], 'all', { ...defaultListFilters, query }, 'en'))
    expect(find('markup')).toEqual([9])
    expect(find('strong')).toEqual([])
    expect(find('<p>')).toEqual([])
  })

  it('has no snippet for an html body without an excerpt', () => {
    expect(searchableText({ ...html, excerpt: null })).toBe('')
  })

  it('keeps searching the whole plain body', () => {
    expect(searchableText(ownerPost({ text: 'a long plain body' }))).toBe(
      'a long plain body'
    )
  })
})
