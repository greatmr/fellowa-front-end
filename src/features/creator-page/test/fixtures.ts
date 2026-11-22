/**
 * `GET /landing/creators/:id/posts` items as `publicPostFields` +
 * `applyContentAccess` build them for an anonymous viewer (Q-51, Q-57,
 * BE-CONT-13; back-end `test/landing-anonymous-posts.e2e-spec.ts`). The
 * marker words let a test prove what is absent from the document.
 */
export const FREE_BODY = 'FREEBODY the whole public post'
export const OPEN_PART = 'OPENPART the free opening'
export const PREVIEW = 'PREVIEWTEXT what the owner typed'

const CREATOR_ID = 4

const row = (id: number) => ({
  id,
  creatorId: CREATOR_ID,
  tags: null,
  createdAt: '2026-10-30T10:00:00.000Z',
})

/** FULL: the body and its media (Q-57); never polls or the position. */
export function rawFull(id = 9, title = 'Hello world') {
  return {
    ...row(id),
    type: 'image',
    title,
    text: FREE_BODY,
    access: 'FULL',
    images: [{ id: 5, url: 'https://cdn.test/IMAGEKEY.png' }],
    videos: [],
    audios: [],
    links: [],
    attachments: [],
  }
}

/** PARTIAL: the opening up to the paywall; no media. */
export function rawPartial(id = 10, text: string | null = OPEN_PART) {
  const base = { ...row(id), type: 'text', title: 'Half open' }
  return text === null
    ? { ...base, access: 'PARTIAL' }
    : { ...base, text, access: 'PARTIAL' }
}

/** TEASER: only the owner's preview, if any. */
export function rawTeaser(id = 11, textPreview: string | null = PREVIEW) {
  const base = { ...row(id), type: 'video', title: 'Members video' }
  return textPreview === null
    ? { ...base, access: 'TEASER' }
    : { ...base, textPreview, access: 'TEASER' }
}

export function rawPostPage(
  items: unknown[],
  {
    total = items.length,
    next = null,
  }: { total?: number; next?: number | null } = {}
) {
  return { items, page: { count: items.length, total, next } }
}

export const ok = (data: unknown) => ({ data, errors: null })
