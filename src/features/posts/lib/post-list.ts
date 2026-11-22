import type { OwnerPost } from '@/features/posts/types/post'
import { htmlToSearchText } from '@/lib/post-body'

/**
 * Tabs, search, access and collection filters and sort, all over the one
 * `GET /content` list (FQ-30 (4)). The collection filter reads each post's
 * `collectionIds` (BE-CONT-15) rather than `?collectionId=`: one list, one
 * key, and "no collection" has no query parameter at all.
 */

export type PostTab = 'all' | 'published' | 'draft'
/** The page's tabs: the three post tabs and the collections grid. */
export type ManagerTab = PostTab | 'collections'
export type AccessFilter = 'all' | 'free' | 'locked'
/** Every post, posts in no collection, or one collection's id. */
export type CollectionFilter = 'all' | 'none' | number
export type SortOrder = 'newest' | 'title'
export type ListFilters = {
  query: string
  access: AccessFilter
  collection: CollectionFilter
  sort: SortOrder
}

export const POST_TABS: readonly PostTab[] = ['all', 'published', 'draft']
export const MANAGER_TABS: readonly ManagerTab[] = [...POST_TABS, 'collections']
export const ACCESS_FILTERS: readonly AccessFilter[] = ['all', 'free', 'locked']
export const SORT_ORDERS: readonly SortOrder[] = ['newest', 'title']

export const defaultListFilters: ListFilters = {
  query: '',
  access: 'all',
  collection: 'all',
  sort: 'newest',
}

/** Code points of the body shown under a row's title. */
export const SNIPPET_LENGTH = 160

/** A draft reads `visibility.datePublished: null` (api.md → "Drafts"). */
export function isDraft(post: OwnerPost): boolean {
  return post.publishedAt === null
}

export function tabCounts(posts: OwnerPost[]): Record<PostTab, number> {
  const drafts = posts.filter(isDraft).length
  return { all: posts.length, published: posts.length - drafts, draft: drafts }
}

export function hasActiveFilters(filters: ListFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.access !== 'all' ||
    filters.collection !== 'all'
  )
}

function inCollection(post: OwnerPost, filter: CollectionFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'none') return post.collectionIds.length === 0
  return post.collectionIds.includes(filter)
}

/**
 * The filter as it applies: a collection that is gone (deleted here or in
 * another tab) no longer narrows the list.
 */
export function effectiveFilters(
  filters: ListFilters,
  collectionIds: readonly number[]
): ListFilters {
  return typeof filters.collection === 'number' &&
    !collectionIds.includes(filters.collection)
    ? { ...filters, collection: 'all' }
    : filters
}

function inTab(post: OwnerPost, tab: PostTab): boolean {
  if (tab === 'all') return true
  return tab === 'draft' ? isDraft(post) : !isDraft(post)
}

export function filterPosts(
  posts: OwnerPost[],
  tab: PostTab,
  filters: ListFilters,
  locale: string
): OwnerPost[] {
  const query = filters.query.trim().toLocaleLowerCase(locale)
  const shown = posts.filter(
    (post) =>
      inTab(post, tab) &&
      (filters.access === 'all' ||
        (filters.access === 'free') === post.isPublic) &&
      inCollection(post, filters.collection) &&
      (!query ||
        post.title.toLocaleLowerCase(locale).includes(query) ||
        searchText(post).toLocaleLowerCase(locale).includes(query))
  )
  if (filters.sort === 'title') {
    const collator = new Intl.Collator(locale)
    return [...shown].sort((a, b) => collator.compare(a.title, b.title))
  }
  return [...shown].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  )
}

/**
 * The whole body as text to match, never shown. A plain body is text
 * already; an `html` body is matched on its text with the tags removed
 * (`htmlToSearchText`), so a word past the excerpt's 200 code points is
 * found and its markup never is.
 */
export function searchText(post: OwnerPost): string {
  return post.bodyFormat === 'plain' ? post.text : htmlToSearchText(post.text)
}

/**
 * The body as text to show under a row's title. A plain body is text
 * already; an `html` body shows the server's `excerpt` (owner reads,
 * BE-CONT-14), its plain-text start.
 */
export function previewText(post: OwnerPost): string {
  return post.bodyFormat === 'plain' ? post.text : (post.excerpt ?? '')
}

/** The start of the body, cut in code points so no character is split. */
export function snippetOf(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const points = Array.from(trimmed)
  return points.length > SNIPPET_LENGTH
    ? `${points.slice(0, SNIPPET_LENGTH).join('').trimEnd()}…`
    : trimmed
}
