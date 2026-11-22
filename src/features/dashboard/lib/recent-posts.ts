import type { DashboardPost } from '@/features/dashboard/types/dashboard'
import { htmlToSearchText, type PostBody } from '@/lib/post-body'

/** How many of the matching posts the dashboard lists ([PROP]; `/posts` has all). */
export const RECENT_POSTS_LIMIT = 5

export const POST_SORTS = ['newest', 'oldest'] as const
export type PostSort = (typeof POST_SORTS)[number]

/**
 * The audience filter, the same split as `/posts` (`posts.list.access`):
 * free is every public post (a paywalled one included), members is a post
 * limited to tiers. It reads the audience the owner chose; it decides no access.
 */
export const AUDIENCE_FILTERS = ['all', 'free', 'members'] as const
export type AudienceFilter = (typeof AUDIENCE_FILTERS)[number]

export type FeedFilters = {
  query: string
  sort: PostSort
  audience: AudienceFilter
}

export const DEFAULT_FEED_FILTERS: FeedFilters = {
  query: '',
  sort: 'newest',
  audience: 'all',
}

export function hasActiveFeedFilters(filters: FeedFilters): boolean {
  return filters.query.trim() !== '' || filters.audience !== 'all'
}

/** The date a card shows, and the one it is sorted by. */
export function postDate(post: DashboardPost): string {
  return post.publishedAt ?? post.createdAt
}

/**
 * Title, the server's excerpt and the body's text. An html body is matched
 * on its text with the tags removed, so a word past the excerpt's 200 code
 * points is still found and its markup never is (`htmlToSearchText`).
 */
function searchableText(post: DashboardPost): string {
  const body =
    post.body === null
      ? ''
      : post.body.format === 'plain'
        ? post.body.text
        : htmlToSearchText(post.body.html)
  return [post.title, post.excerpt ?? '', body].join('\n')
}

function inAudience(post: DashboardPost, filter: AudienceFilter): boolean {
  if (filter === 'all') return true
  return (filter === 'members') === (post.audience === 'tiers')
}

/** The owner's posts matching the toolbar, client-side, in the chosen order. */
export function filterFeed(
  posts: readonly DashboardPost[],
  filters: FeedFilters,
  locale: string
): DashboardPost[] {
  const query = filters.query.trim().toLocaleLowerCase(locale)
  const direction = filters.sort === 'newest' ? -1 : 1
  return posts
    .filter(
      (post) =>
        inAudience(post, filters.audience) &&
        (query === '' ||
          searchableText(post).toLocaleLowerCase(locale).includes(query))
    )
    .sort(
      (a, b) =>
        direction * (Date.parse(postDate(a)) - Date.parse(postDate(b))) ||
        direction * (a.id - b.id)
    )
}

/** Lines a card's body shows before it is clamped (`line-clamp-6`). */
const CLAMP_LINES = 6
/** Roughly six lines of body text in the dashboard column. */
const LONG_BODY_CODE_POINTS = 400

/**
 * Whether a body is long enough to be clamped, so the card offers the rest
 * ([PROP]). An estimate from the text, never a measurement: lines, blocks
 * and length, erring long (a paragraph in a list item counts twice). An
 * html body is inspected as a string only.
 */
export function isLongBody(body: PostBody): boolean {
  if (body.format === 'plain') {
    return (
      body.text.trim().split('\n').length > CLAMP_LINES ||
      Array.from(body.text.trim()).length > LONG_BODY_CODE_POINTS
    )
  }
  const blocks =
    body.html.match(/<\/(?:p|li|h2|h3|blockquote)>|<br\s*\/?>/gi)?.length ?? 0
  const text = htmlToSearchText(body.html)
  return blocks > CLAMP_LINES || Array.from(text).length > LONG_BODY_CODE_POINTS
}
