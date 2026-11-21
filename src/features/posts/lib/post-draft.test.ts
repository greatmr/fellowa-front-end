import { describe, expect, it } from 'vitest'

import { studioPost } from '../test/fixtures'
import {
  draftFromPost,
  draftProblems,
  emptyPostDraft,
  isEditableType,
  saveInputFromDraft,
  statusInput,
  type PostDraft,
} from './post-draft'

const draft = (patch: Partial<PostDraft> = {}): PostDraft => ({
  ...emptyPostDraft(),
  title: 'عنوان',
  before: 'متن',
  ...patch,
})

describe('composer draft → write payload', () => {
  it('creates a free text post: no divider, tier links cleared, published now', () => {
    expect(saveInputFromDraft(draft(), 'publish', null)).toEqual({
      kind: 'text',
      payload: {
        title: 'عنوان',
        text: 'متن',
        paywallPosition: null,
        tireIds: [],
        visibility: { type: true },
      },
    })
  })

  it('sends the divider as a code-point offset with Persian text and emoji', () => {
    const input = saveInputFromDraft(
      draft({ before: 'سلام 😀 ', after: 'ادامه' }),
      'draft',
      null
    )
    expect(input.payload.text).toBe('سلام 😀 ادامه')
    // "سلام" 4 + space + emoji 1 + space = 7 code points (8 UTF-16 units).
    expect(input.payload.paywallPosition).toBe(7)
    expect(input.payload.visibility).toEqual({ type: true, isDraft: true })
  })

  it('limits to picked tiers, trims the title, and routes image posts to the image route', () => {
    const input = saveInputFromDraft(
      draft({
        title: '  عنوان  ',
        access: 'tiers',
        tiers: { mode: 'pick', ids: [3, 5] },
        images: [{ id: 40, url: null, attached: false }],
      }),
      'publish',
      null
    )
    expect(input).toEqual({
      kind: 'image',
      payload: {
        title: 'عنوان',
        text: 'متن',
        paywallPosition: null,
        tireIds: [3, 5],
        visibility: { type: false },
        imageIds: [40],
      },
    })
  })

  it('on edit, keeps unknown tiers, the publish date, the preview and early access', () => {
    const saved = studioPost({
      isPublic: false,
      textPreview: 'پیش‌نمایش',
      dateEarly: '2026-12-01T00:00:00.000Z',
      paywallPosition: 4,
      text: 'سلام دنیا',
    })
    const input = saveInputFromDraft(draftFromPost(saved), 'publish', saved)
    expect(input).toEqual({
      postId: 12,
      kind: 'text',
      payload: {
        title: 'سلام دنیا',
        text: 'سلام دنیا',
        paywallPosition: 4,
        visibility: {
          type: false,
          datePublished: '2026-11-20T08:00:00.000Z',
          textPreview: 'پیش‌نمایش',
          earlyAccess: true,
          dateEarly: '2026-12-01T00:00:00.000Z',
        },
      },
    })
    expect(input.payload).not.toHaveProperty('tireIds')
  })

  it('keeps an image post on the image route after its images are removed', () => {
    const saved = studioPost({ type: 'image' })
    const input = saveInputFromDraft(draftFromPost(saved), 'draft', saved)
    expect(input.kind).toBe('image')
    expect(input.payload.imageIds).toEqual([])
  })
})

describe('draftFromPost', () => {
  it('splits the body at the stored paywall position', () => {
    const result = draftFromPost(
      studioPost({ text: 'ab😀cd', paywallPosition: 3, isPublic: false })
    )
    expect(result).toMatchObject({
      before: 'ab😀',
      after: 'cd',
      access: 'tiers',
      tiers: { mode: 'keep' },
    })
  })

  it('marks saved images as attached', () => {
    const result = draftFromPost(
      studioPost({ images: [{ id: 1, url: 'https://cdn.example/a.png' }] })
    )
    expect(result.images).toEqual([
      { id: 1, url: 'https://cdn.example/a.png', attached: true },
    ])
    expect(result.after).toBe(null)
  })
})

describe('draftProblems', () => {
  it('needs a non-blank title for both intents', () => {
    expect(draftProblems(draft({ title: '  ' }), 'draft')).toEqual(['title'])
  })

  it('needs a tier to publish a limited post (O-4), but not to save a draft', () => {
    const limited = draft({ access: 'tiers', tiers: { mode: 'pick', ids: [] } })
    expect(draftProblems(limited, 'publish')).toEqual(['tiers'])
    expect(draftProblems(limited, 'draft')).toEqual([])
    expect(
      draftProblems({ ...limited, tiers: { mode: 'keep' } }, 'publish')
    ).toEqual([])
  })
})

describe('statusInput', () => {
  it('publishes a draft now and unpublishes with isDraft, resending only title and visibility', () => {
    const post = studioPost({ publishedAt: null, isPublic: false })
    expect(statusInput(post, 'publish')).toEqual({
      postId: 12,
      title: 'سلام دنیا',
      visibility: { type: false },
    })
    expect(statusInput(studioPost(), 'draft')).toEqual({
      postId: 12,
      title: 'سلام دنیا',
      visibility: { type: true, isDraft: true },
    })
  })
})

it('edits text and image posts only', () => {
  expect(['text', 'image', 'video', 'poll'].map(isEditableType)).toEqual([
    true,
    true,
    false,
    false,
  ])
})
