import { describe, expect, it } from 'vitest'

import { ownerPost } from '../test/fixtures'
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
  before: '<p dir="auto">متن</p>',
  ...patch,
})

describe('composer draft → write payload', () => {
  it('creates a free text post: no divider, tier links cleared, published now', () => {
    expect(saveInputFromDraft(draft(), 'publish', null)).toEqual({
      kind: 'text',
      payload: {
        title: 'عنوان',
        text: '<p dir="auto">متن</p>',
        bodyFormat: 'html',
        paywallPosition: null,
        tireIds: [],
        visibility: { type: true },
      },
    })
  })

  it('sends the divider as the index of the first gated top-level block (Q-83)', () => {
    const input = saveInputFromDraft(
      draft({
        before:
          '<h2 dir="auto">سلام 😀</h2><ul><li><p>یک</p><ul><li><p>دو</p></li></ul></li></ul>',
        after: '<p dir="auto">ادامه</p>',
      }),
      'draft',
      null
    )
    expect(input.payload.text).toBe(
      '<h2 dir="auto">سلام 😀</h2><ul><li><p>یک</p><ul><li><p>دو</p></li></ul></li></ul><p dir="auto">ادامه</p>'
    )
    // The heading and the whole (nested) list: two blocks.
    expect(input.payload.paywallPosition).toBe(2)
    expect(input.payload.bodyFormat).toBe('html')
    expect(input.payload.visibility).toEqual({ type: true, isDraft: true })
  })

  it('gates everything with the divider first', () => {
    const input = saveInputFromDraft(
      draft({ before: '', after: '<p>a</p>' }),
      'draft',
      null
    )
    expect(input.payload).toMatchObject({
      text: '<p>a</p>',
      paywallPosition: 0,
    })
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
        text: '<p dir="auto">متن</p>',
        bodyFormat: 'html',
        paywallPosition: null,
        tireIds: [3, 5],
        visibility: { type: false },
        imageIds: [40],
      },
    })
  })

  it('on edit, keeps unknown tiers, the publish date, the preview and early access', () => {
    const saved = ownerPost({
      isPublic: false,
      textPreview: 'پیش‌نمایش',
      dateEarly: '2026-12-01T00:00:00.000Z',
      paywallPosition: 1,
      text: '<p dir="auto">سلام</p><p dir="auto">دنیا</p>',
      bodyFormat: 'html',
    })
    const input = saveInputFromDraft(draftFromPost(saved), 'publish', saved)
    expect(input).toEqual({
      postId: 12,
      kind: 'text',
      payload: {
        title: 'سلام دنیا',
        text: '<p dir="auto">سلام</p><p dir="auto">دنیا</p>',
        bodyFormat: 'html',
        paywallPosition: 1,
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
    const saved = ownerPost({ type: 'image' })
    const input = saveInputFromDraft(draftFromPost(saved), 'draft', saved)
    expect(input.kind).toBe('image')
    expect(input.payload.imageIds).toEqual([])
  })
})

it('sends no paywall when no block follows the divider', () => {
  const input = saveInputFromDraft(
    draft({ before: '<p>متن</p>', after: ' \n' }),
    'publish',
    null
  )
  expect(input.payload).toMatchObject({
    text: '<p>متن</p> \n',
    paywallPosition: null,
  })
})

describe('draftFromPost', () => {
  it('splits an html body at its stored block index', () => {
    const result = draftFromPost(
      ownerPost({
        text: '<p>a</p><ul><li>1</li></ul><p>b</p>',
        bodyFormat: 'html',
        paywallPosition: 2,
        isPublic: false,
      })
    )
    expect(result).toMatchObject({
      before: '<p>a</p><ul><li>1</li></ul>',
      after: '<p>b</p>',
      access: 'tiers',
      tiers: { mode: 'keep' },
    })
  })

  it('converts a plain body in memory: split at the code-point offset, escaped paragraphs', () => {
    const result = draftFromPost(
      ownerPost({ text: 'ab😀cd<i>', bodyFormat: 'plain', paywallPosition: 3 })
    )
    expect(result).toMatchObject({
      before: '<p dir="auto">ab😀</p>',
      after: '<p dir="auto">cd&lt;i&gt;</p>',
    })
    expect(
      saveInputFromDraft(result, 'publish', ownerPost()).payload
    ).toMatchObject({ bodyFormat: 'html', paywallPosition: 1 })
  })

  it('has no divider for a body without a paywall, in either format', () => {
    expect(
      draftFromPost(ownerPost({ text: 'a', bodyFormat: 'plain' }))
    ).toMatchObject({ before: '<p dir="auto">a</p>', after: null })
    expect(
      draftFromPost(ownerPost({ text: '<p>a</p>', bodyFormat: 'html' }))
    ).toMatchObject({ before: '<p>a</p>', after: null })
  })

  it('marks saved images as attached', () => {
    const result = draftFromPost(
      ownerPost({ images: [{ id: 1, url: 'https://cdn.example/a.png' }] })
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
    const post = ownerPost({ publishedAt: null, isPublic: false })
    expect(statusInput(post, 'publish')).toEqual({
      postId: 12,
      title: 'سلام دنیا',
      visibility: { type: false },
    })
    expect(statusInput(ownerPost(), 'draft')).toEqual({
      postId: 12,
      title: 'سلام دنیا',
      visibility: { type: true, isDraft: true },
    })
  })
})

it('edits every type the composer writes, and not links', () => {
  expect(
    ['text', 'image', 'video', 'audio', 'poll', 'link'].map(isEditableType)
  ).toEqual([true, true, true, true, true, false])
})

describe('video, audio and poll posts (FE-POST-02)', () => {
  it('creates a video post with the finalized upload id', () => {
    const input = saveInputFromDraft(
      draft({
        media: 'video',
        upload: { id: 70, name: 'clip', attached: false },
      }),
      'publish',
      null
    )
    expect(input.kind).toBe('video')
    expect(input.payload.videoId).toBe(70)
    expect(input.payload).not.toHaveProperty('imageIds')
  })

  it('sends an audio id only for a new upload, never the saved one again', () => {
    const saved = ownerPost({
      type: 'audio',
      audios: [{ id: 81, name: 'ep1.mp3' }],
    })
    const fromSaved = draftFromPost(saved)
    expect(fromSaved.media).toBe('audio')
    expect(fromSaved.upload).toEqual({
      id: 81,
      name: 'ep1.mp3',
      attached: true,
    })
    const input = saveInputFromDraft(fromSaved, 'publish', saved)
    expect(input).toMatchObject({ postId: 12, kind: 'audio' })
    expect(input.payload).not.toHaveProperty('audioId')
  })

  it('adds a video to a saved text post through the video route', () => {
    const saved = ownerPost()
    const input = saveInputFromDraft(
      {
        ...draftFromPost(saved),
        media: 'video',
        upload: { id: 5, name: null, attached: false },
      },
      'draft',
      saved
    )
    expect(input).toMatchObject({ postId: 12, kind: 'video' })
    expect(input.payload.videoId).toBe(5)
  })

  it('sends trimmed poll options without blanks, the choice mode, and resends the closing time', () => {
    const saved = ownerPost({
      type: 'poll',
      poll: {
        multiSelect: true,
        closesAt: '2026-12-01T10:00:00.000Z',
        options: [
          { id: 1, label: 'بله' },
          { id: 2, label: 'خیر' },
        ],
      },
    })
    const fromSaved = draftFromPost(saved)
    expect(fromSaved.poll.options).toEqual(['بله', 'خیر'])
    const input = saveInputFromDraft(
      {
        ...fromSaved,
        poll: { ...fromSaved.poll, options: [' بله ', '', 'خیر', 'شاید'] },
      },
      'publish',
      saved
    )
    expect(input.kind).toBe('poll')
    expect(input.payload).toMatchObject({
      options: [{ option: 'بله' }, { option: 'خیر' }, { option: 'شاید' }],
      typeSelect: true,
      endDataPublished: '2026-12-01T10:00:00.000Z',
    })
  })

  it('creates a poll with no closing time', () => {
    const input = saveInputFromDraft(
      draft({
        media: 'poll',
        poll: { options: ['a', 'b'], multiSelect: false, closesAt: null },
      }),
      'publish',
      null
    )
    expect(input.payload).not.toHaveProperty('endDataPublished')
    expect(input.payload.typeSelect).toBe(false)
  })

  it('saves an empty image block as text, as the API would read it', () => {
    expect(
      saveInputFromDraft(draft({ media: 'image' }), 'draft', null).kind
    ).toBe('text')
  })

  it('needs the file and two options to publish, not to save a draft', () => {
    const video = draft({ media: 'video' })
    expect(draftProblems(video, 'publish')).toEqual(['media'])
    expect(draftProblems(video, 'draft')).toEqual([])
    const poll = draft({
      media: 'poll',
      poll: { options: ['one', '  '], multiSelect: false, closesAt: null },
    })
    expect(draftProblems(poll, 'publish')).toEqual(['poll'])
    expect(draftProblems(poll, 'draft')).toEqual([])
  })
})
