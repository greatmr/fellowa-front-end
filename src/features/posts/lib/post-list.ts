import type { StudioPost } from '@/features/posts/types/post'

/**
 * Tabs, search, access filter and sort, all over the one `GET /content` list
 * (FQ-30 (4)): the route has no query parameters for any of them.
 */

export type PostTab = 'all' | 'published' | 'draft'
export type AccessFilter = 'all' | 'free' | 'locked'
export type SortOrder = 'newest' | 'title'
export type ListFilters = {
  query: string
  access: AccessFilter
  sort: SortOrder
}

export const POST_TABS: readonly PostTab[] = ['all', 'published', 'draft']
export const ACCESS_FILTERS: readonly AccessFilter[] = ['all', 'free', 'locked']
export const SORT_ORDERS: readonly SortOrder[] = ['newest', 'title']

export const defaultListFilters: ListFilters = {
  query: '',
  access: 'all',
  sort: 'newest',
}

/** Code points of the body shown under a row's title. */
export const SNIPPET_LENGTH = 160

/** A draft reads `visibility.datePublished: null` (api.md → "Drafts"). */
export function isDraft(post: StudioPost): boolean {
  return post.publishedAt === null
}

export function tabCounts(posts: StudioPost[]): Record<PostTab, number> {
  const drafts = posts.filter(isDraft).length
  return { all: posts.length, published: posts.length - drafts, draft: drafts }
}

export function hasActiveFilters(filters: ListFilters): boolean {
  return filters.query.trim() !== '' || filters.access !== 'all'
}

function inTab(post: StudioPost, tab: PostTab): boolean {
  if (tab === 'all') return true
  return tab === 'draft' ? isDraft(post) : !isDraft(post)
}

export function filterPosts(
  posts: StudioPost[],
  tab: PostTab,
  filters: ListFilters,
  locale: string
): StudioPost[] {
  const query = filters.query.trim().toLocaleLowerCase(locale)
  const shown = posts.filter(
    (post) =>
      inTab(post, tab) &&
      (filters.access === 'all' ||
        (filters.access === 'free') === post.isPublic) &&
      (!query ||
        post.title.toLocaleLowerCase(locale).includes(query) ||
        post.text.toLocaleLowerCase(locale).includes(query))
  )
  if (filters.sort === 'title') {
    const collator = new Intl.Collator(locale)
    return [...shown].sort((a, b) => collator.compare(a.title, b.title))
  }
  return [...shown].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  )
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
