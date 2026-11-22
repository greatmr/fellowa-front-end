import { describe, expect, it } from 'vitest'

import {
  AUDIO_URL,
  BODY,
  OPEN_PART,
  PREVIEW,
  ok,
  rawFullMember,
  rawFullObjectStorage,
  rawFullPublic,
  rawPartial,
  rawTeaser,
  VIDEO_URL,
} from '../test/fixtures'
import {
  InvalidReaderPostResponseError,
  idParamSchema,
  parseReaderPost,
} from './reader-post'

describe('parseReaderPost (FE-CONT-01)', () => {
  it('reads a landing FULL post with its media and no poll (Q-57)', () => {
    expect(parseReaderPost(ok(rawFullPublic()))).toEqual({
      id: 31,
      creatorId: 4,
      type: 'image',
      title: 'A title',
      createdAt: '2026-11-01T10:00:00.000Z',
      access: 'FULL',
      body: { format: 'plain', text: BODY },
      images: [{ id: 5, url: 'https://cdn.test/IMAGEKEY.png' }],
      attachments: [{ id: 9, url: 'https://cdn.test/FILEKEY.pdf' }],
      links: [{ id: 8, url: 'https://link.test/page' }],
      videos: [{ id: 6, playbackUrl: null }],
      audios: [{ id: 7, ready: true, playbackUrl: null }],
      poll: null,
    })
  })

  it('reads the poll a member gets on GET /content/:id', () => {
    const post = parseReaderPost(ok(rawFullMember()))
    expect(post).toMatchObject({
      access: 'FULL',
      poll: {
        id: 3,
        options: [
          { id: 11, label: 'POLLOPTION one' },
          { id: 12, label: 'POLLOPTION two' },
        ],
      },
    })
  })

  it('drops a media URL that is not absolute http(s)', () => {
    const raw = {
      ...rawFullPublic(),
      images: [{ id: 5, url: 'javascript:alert(1)' }],
      links: [{ id: 8, link: 'patreon/file/key' }],
    }
    expect(parseReaderPost(ok(raw))).toMatchObject({
      images: [{ id: 5, url: null }],
      links: [{ id: 8, url: null }],
    })
  })

  it('reads playbackUrl on object-storage media (BE-CONT-16)', () => {
    expect(parseReaderPost(ok(rawFullObjectStorage()))).toMatchObject({
      videos: [{ id: 6, playbackUrl: VIDEO_URL }],
      audios: [{ id: 7, ready: true, playbackUrl: AUDIO_URL }],
    })
  })

  it('drops a playbackUrl that is not absolute http(s), and reads its absence as null', () => {
    const raw = rawFullObjectStorage()
    const unsafe = {
      ...raw,
      videos: [{ ...raw.videos[0], playbackUrl: 'javascript:alert(1)' }],
      // A server older than BE-CONT-16 sends no key.
      audios: rawFullPublic().audios.map((a) => {
        const { playbackUrl, ...older } = a
        void playbackUrl
        return older
      }),
    }
    expect(parseReaderPost(ok(unsafe))).toMatchObject({
      videos: [{ id: 6, playbackUrl: null }],
      audios: [{ id: 7, playbackUrl: null }],
    })
  })

  it('reads PARTIAL as the opening the server cut, or none at position 0', () => {
    expect(parseReaderPost(ok(rawPartial()))).toMatchObject({
      access: 'PARTIAL',
      body: { format: 'plain', text: OPEN_PART },
    })
    expect(parseReaderPost(ok(rawPartial(null)))).toMatchObject({
      access: 'PARTIAL',
      body: null,
    })
  })

  it('reads an html body only when the server says html (BE-CONT-14)', () => {
    const html = '<p dir="auto">باز</p><ul><li>یک</li></ul>'
    expect(
      parseReaderPost(ok({ ...rawPartial(html), bodyFormat: 'html' }))
    ).toMatchObject({ access: 'PARTIAL', body: { format: 'html', html } })
    expect(
      parseReaderPost(
        ok({ ...rawFullPublic(), text: html, bodyFormat: 'html' })
      )
    ).toMatchObject({ access: 'FULL', body: { format: 'html', html } })
    // Absent (an older server) or plain: text, never markup.
    expect(parseReaderPost(ok({ ...rawPartial(html) }))).toMatchObject({
      body: { format: 'plain', text: html },
    })
    expect(
      parseReaderPost(ok({ ...rawPartial(html), bodyFormat: 'plain' }))
    ).toMatchObject({ body: { format: 'plain', text: html } })
    expect(() =>
      parseReaderPost(ok({ ...rawPartial(html), bodyFormat: 'markdown' }))
    ).toThrow()
  })

  it('reads TEASER as the owner preview, or none', () => {
    expect(parseReaderPost(ok(rawTeaser()))).toMatchObject({
      access: 'TEASER',
      textPreview: PREVIEW,
    })
    expect(parseReaderPost(ok(rawTeaser(null)))).toMatchObject({
      access: 'TEASER',
      textPreview: null,
    })
  })

  it('never passes on a gated key a TEASER or PARTIAL response should not hold', () => {
    const leaky = {
      ...rawTeaser(),
      text: 'GATEDTEXT',
      images: [{ id: 1, url: 'https://cdn.test/GATED.png' }],
    }
    const teaser = parseReaderPost(ok(leaky))
    expect(JSON.stringify(teaser)).not.toMatch(/GATED/)

    const partial = parseReaderPost(
      ok({
        ...rawPartial(),
        images: [{ id: 1, url: 'https://cdn.test/G.png' }],
      })
    )
    expect(partial).not.toHaveProperty('images')
  })

  it.each([
    [
      'DENY, which no route sends as a body',
      { ...rawTeaser(), access: 'DENY' },
    ],
    ['an unknown level', { ...rawTeaser(), access: 'OPEN' }],
    ['a FULL post without its media keys', { ...rawPartial(), access: 'FULL' }],
    ['a missing title', { ...rawTeaser(), title: undefined }],
  ])('refuses %s', (_name, raw) => {
    expect(() => parseReaderPost(ok(raw))).toThrow(
      InvalidReaderPostResponseError
    )
  })
})

describe('idParamSchema', () => {
  it.each(['1', '31', '2147483647'])('accepts %s', (value) => {
    expect(idParamSchema.safeParse(value).success).toBe(true)
  })

  it.each(['0', '031', '-1', '1e3', '0x1f', ' 1', '2147483648', 'abc'])(
    'refuses %j',
    (value) => {
      expect(idParamSchema.safeParse(value).success).toBe(false)
    }
  )
})
