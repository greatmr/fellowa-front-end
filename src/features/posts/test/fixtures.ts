import type { StudioPost } from '@/features/posts/types/post'

/**
 * One `GET /content` item as back-end `acffdb2` sends it: `formatForOwner`
 * (`content-format.ts`) plus `access` from `applyContentAccess`. Dates are
 * the JSON form of `timestamptz` columns.
 */
export function rawPost(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    type: 'text',
    title: 'سلام دنیا',
    text: 'متن آزاد. ادامه برای اعضا',
    tags: null,
    isApprove: true,
    visibility: {
      contentId: 12,
      type: true,
      datePublished: '2026-11-20T08:00:00.000Z',
      earlyAccess: false,
      dateEarly: null,
      textPreview: null,
    },
    images: [],
    videos: [],
    audios: [],
    links: [],
    polls: [],
    attachments: [],
    createdAt: '2026-11-20T08:00:00.000Z',
    paywallPosition: null,
    access: 'FULL',
    ...overrides,
  }
}

/** The model `parsePost` makes of {@link rawPost}. */
export function studioPost(overrides: Partial<StudioPost> = {}): StudioPost {
  return {
    id: 12,
    type: 'text',
    title: 'سلام دنیا',
    text: 'متن آزاد. ادامه برای اعضا',
    isPublic: true,
    publishedAt: '2026-11-20T08:00:00.000Z',
    createdAt: '2026-11-20T08:00:00.000Z',
    paywallPosition: null,
    textPreview: null,
    dateEarly: null,
    images: [],
    attachments: [],
    ...overrides,
  }
}
