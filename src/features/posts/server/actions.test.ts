import { HttpResponse, http } from 'msw'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '../../../../test/msw/server'
import type {
  PostWritePayload,
  SavePostInput,
} from '@/features/posts/types/post'

import { rawPost, studioPost } from '../test/fixtures'

const request = vi.hoisted(() => ({
  origin: 'https://fellowa.test',
  cookie: '',
}))
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ origin: request.origin }),
  cookies: async () => ({
    get: () =>
      request.cookie
        ? { name: 'fellowa_session', value: request.cookie }
        : undefined,
  }),
}))

const apiOrigin = 'https://api.fellowa.test/api'
vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', apiOrigin)
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fellowa.test')
const {
  deletePostForHook,
  finalizeMediaUploadForHook,
  getPostForHook,
  initMediaUploadForHook,
  listPostsForHook,
  savePostForHook,
  setPostStatusForHook,
  uploadMediaChunkForHook,
  uploadPostAttachmentForHook,
  uploadPostImageForHook,
} = await import('./actions')
afterAll(() => vi.unstubAllEnvs())

const tokenExpiry = Math.floor(Date.now() / 1000) + 3600

function token(userId = 42) {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: tokenExpiry })
  ).toString('base64url')
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.backendSignature`
}

const ok = (data: unknown) => HttpResponse.json({ data, errors: null })

let writes: Array<{ method: string; path: string; body: unknown }> = []

beforeEach(() => {
  request.origin = 'https://fellowa.test'
  request.cookie = token()
  writes = []
  server.use(
    http.get(`${apiOrigin}/user/42/profile`, () =>
      ok({
        id: 42,
        email: 'creator@example.com',
        alias: 'sara',
        isVerified: true,
        displayName: 'Sara',
        hasPassword: true,
      })
    )
  )
})

function recordWrite(method: string, response: () => Response) {
  return async ({ request: upstream }: { request: Request }) => {
    expect(upstream.headers.get('authorization')).toBe(`Bearer ${token()}`)
    const type = upstream.headers.get('content-type') ?? ''
    writes.push({
      method,
      path: new URL(upstream.url).pathname.replace('/api', ''),
      body: type.includes('json') ? await upstream.json() : null,
    })
    return response()
  }
}

const textPayload = {
  title: 'عنوان',
  text: 'سلام 😀 ادامه',
  paywallPosition: 7,
  tireIds: [3],
  visibility: { type: false },
}

describe('posts server boundary', () => {
  it('reads the owner list, normalised, without the token or unread keys', async () => {
    server.use(
      http.get(`${apiOrigin}/content`, ({ request: upstream }) => {
        expect(upstream.headers.get('authorization')).toBe(`Bearer ${token()}`)
        return ok([
          rawPost(),
          rawPost({
            id: 13,
            type: 'image',
            text: null,
            visibility: {
              contentId: 13,
              type: false,
              datePublished: null,
              earlyAccess: false,
              dateEarly: null,
              textPreview: null,
            },
            images: [{ id: 5, url: 'https://cdn.example/a.png' }],
            attachments: [{ id: 6, url: 'not a url' }],
            paywallPosition: 0,
          }),
        ])
      })
    )
    const result = await listPostsForHook(42)
    expect(result).toEqual({
      ok: true,
      data: [
        studioPost(),
        studioPost({
          id: 13,
          type: 'image',
          text: '',
          isPublic: false,
          publishedAt: null,
          paywallPosition: 0,
          images: [{ id: 5, url: 'https://cdn.example/a.png' }],
          attachments: [{ id: 6, url: null }],
        }),
      ],
    })
    expect(JSON.stringify(result)).not.toContain(token())
    expect(await listPostsForHook(9)).toMatchObject({ ok: false, status: 403 })
  })

  it('maps a malformed list to a stable code', async () => {
    server.use(http.get(`${apiOrigin}/content`, () => ok([{ id: 'x' }])))
    expect(await listPostsForHook(42)).toEqual({
      ok: false,
      code: 'INVALID_POST_RESPONSE',
    })
  })

  it('reads one post and passes the 404 of a post that is not the owner’s', async () => {
    server.use(
      http.get(`${apiOrigin}/content/12`, () => ok(rawPost())),
      http.get(`${apiOrigin}/content/99`, () =>
        HttpResponse.json(
          {
            data: null,
            errors: [
              { message: 'Content not found', code: 'CONTENT_NOT_FOUND' },
            ],
          },
          { status: 404 }
        )
      )
    )
    expect(await getPostForHook(42, 12)).toEqual({
      ok: true,
      data: studioPost(),
    })
    expect(await getPostForHook(42, 99)).toMatchObject({
      ok: false,
      status: 404,
      code: 'CONTENT_NOT_FOUND',
    })
  })

  it('creates on POST and updates on PUT of the kind’s route, with the payload as sent', async () => {
    server.use(
      http.post(
        `${apiOrigin}/content/text`,
        recordWrite('POST', () => ok(rawPost()))
      ),
      http.put(
        `${apiOrigin}/content/image/12`,
        recordWrite('PUT', () => ok(rawPost({ type: 'image' })))
      )
    )
    expect(
      await savePostForHook(42, { kind: 'text', payload: textPayload })
    ).toMatchObject({ ok: true, data: { id: 12 } })
    const imagePayload = { ...textPayload, imageIds: [5] }
    expect(
      await savePostForHook(42, {
        postId: 12,
        kind: 'image',
        payload: imagePayload,
      })
    ).toMatchObject({ ok: true, data: { type: 'image' } })
    expect(writes).toEqual([
      { method: 'POST', path: '/content/text', body: textPayload },
      { method: 'PUT', path: '/content/image/12', body: imagePayload },
    ])
  })

  it('keeps the O-4 refusal’s code for the composer', async () => {
    server.use(
      http.post(`${apiOrigin}/content/text`, () =>
        HttpResponse.json(
          {
            data: null,
            errors: [
              {
                message: 'select at least one tier',
                code: 'CONTENT_TIER_REQUIRED',
              },
            ],
          },
          { status: 400 }
        )
      )
    )
    expect(
      await savePostForHook(42, { kind: 'text', payload: textPayload })
    ).toMatchObject({ ok: false, status: 400, code: 'CONTENT_TIER_REQUIRED' })
  })

  it('checks the Origin and the payload before writing', async () => {
    request.origin = 'https://attacker.example'
    expect(
      await savePostForHook(42, { kind: 'text', payload: textPayload })
    ).toMatchObject({ ok: false, status: 403 })
    request.origin = 'https://fellowa.test'
    const bad = [
      { ...textPayload, title: '   ' },
      { ...textPayload, title: 'x'.repeat(201) },
      { ...textPayload, paywallPosition: -1 },
      { ...textPayload, paywallPosition: 1.5 },
      { ...textPayload, visibility: { type: false, publishAt: 'x' } },
      { ...textPayload, imageIds: [1] },
    ]
    for (const payload of bad) {
      expect(
        await savePostForHook(42, { kind: 'text', payload })
      ).toMatchObject({ ok: false, status: 400 })
    }
    expect(writes).toEqual([])
  })

  it('publishes or unpublishes through PUT /content/text/:id with title and visibility only', async () => {
    server.use(
      http.put(
        `${apiOrigin}/content/text/13`,
        recordWrite('PUT', () => ok(rawPost({ id: 13 })))
      )
    )
    const input = {
      postId: 13,
      title: 'عنوان',
      visibility: { type: true, isDraft: true },
    }
    expect(await setPostStatusForHook(42, input)).toMatchObject({ ok: true })
    expect(writes).toEqual([
      {
        method: 'PUT',
        path: '/content/text/13',
        body: { title: 'عنوان', visibility: { type: true, isDraft: true } },
      },
    ])
  })

  it('deletes a post', async () => {
    server.use(
      http.delete(
        `${apiOrigin}/content/12`,
        recordWrite('DELETE', () => ok({ message: 'Content deleted' }))
      )
    )
    expect(await deletePostForHook(42, 12)).toEqual({ ok: true, data: null })
    expect(await deletePostForHook(42, 0)).toMatchObject({
      ok: false,
      status: 400,
    })
    expect(writes).toHaveLength(1)
  })

  it('checks an image’s type and size before uploading it to /content/image-file', async () => {
    let uploads = 0
    server.use(
      http.post(`${apiOrigin}/content/image-file`, async ({ request: up }) => {
        uploads++
        expect(up.headers.get('content-type')).toContain('multipart/form-data')
        return ok({ id: 40, url: 'https://cdn.example/i.png' })
      })
    )
    const form = (file: File) => {
      const body = new FormData()
      body.append('image', file)
      return body
    }
    const svg = new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' })
    const huge = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'a.png', {
      type: 'image/png',
    })
    const png = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })
    expect(await uploadPostImageForHook(42, form(svg))).toMatchObject({
      ok: false,
      status: 400,
    })
    expect(await uploadPostImageForHook(42, form(huge))).toMatchObject({
      ok: false,
      status: 400,
    })
    expect(uploads).toBe(0)
    expect(await uploadPostImageForHook(42, form(png))).toEqual({
      ok: true,
      data: { id: 40, url: 'https://cdn.example/i.png' },
    })
  })

  it('uploads an attachment to the post’s own route, field `file`', async () => {
    server.use(
      http.post(
        `${apiOrigin}/content/12/attachment`,
        async ({ request: up }) => {
          expect(up.headers.get('content-type')).toContain(
            'multipart/form-data'
          )
          return ok({ id: 6, url: 'https://cdn.example/f.pdf' })
        }
      )
    )
    const body = new FormData()
    body.append(
      'file',
      new File([new Uint8Array([1])], 'f.pdf', { type: 'application/pdf' })
    )
    expect(await uploadPostAttachmentForHook(42, 12, body)).toEqual({
      ok: true,
      data: { id: 6, url: 'https://cdn.example/f.pdf' },
    })
  })

  it('reads a video, an audio and a poll post as the owner sees them, creatorId accepted', async () => {
    server.use(
      http.get(`${apiOrigin}/content`, () =>
        ok([
          rawPost({
            id: 20,
            creatorId: 42,
            type: 'video',
            videos: [
              {
                id: 70,
                contentId: 20,
                videoCloudId: 'v-1',
                videoCloudChannel: null,
                fileNameCloud: 'clip.mp4',
                createdAt: '2026-11-20T08:00:00.000Z',
              },
            ],
          }),
          rawPost({
            id: 21,
            type: 'audio',
            audios: [
              {
                id: 81,
                contentId: 21,
                audioCloudId: 'a-1',
                audioCloudChannel: null,
                fileNameCloud: null,
                status: false,
                createdAt: '2026-11-20T08:00:00.000Z',
              },
            ],
          }),
          rawPost({
            id: 22,
            type: 'poll',
            polls: [
              {
                id: 3,
                typeSelect: false,
                endDataPublished: null,
                options: [
                  { id: 1, pollId: 3, option: 'بله' },
                  { id: 2, pollId: 3, option: 'خیر' },
                ],
              },
            ],
          }),
        ])
      )
    )
    expect(await listPostsForHook(42)).toEqual({
      ok: true,
      data: [
        studioPost({
          id: 20,
          type: 'video',
          videos: [{ id: 70, name: 'clip.mp4' }],
        }),
        studioPost({
          id: 21,
          type: 'audio',
          audios: [{ id: 81, name: null }],
        }),
        studioPost({
          id: 22,
          type: 'poll',
          poll: {
            multiSelect: false,
            closesAt: null,
            options: [
              { id: 1, label: 'بله' },
              { id: 2, label: 'خیر' },
            ],
          },
        }),
      ],
    })
  })

  it('writes video, audio and poll posts to their own routes, and refuses another route’s keys', async () => {
    server.use(
      http.post(
        `${apiOrigin}/content/video`,
        recordWrite('POST', () => ok(rawPost({ type: 'video' })))
      ),
      http.put(
        `${apiOrigin}/content/poll/12`,
        recordWrite('PUT', () => ok(rawPost({ type: 'poll' })))
      )
    )
    const video = { ...textPayload, videoId: 70 }
    const poll = {
      ...textPayload,
      options: [{ option: 'بله' }, { option: 'خیر' }],
      typeSelect: true,
      endDataPublished: '2026-12-01T10:00:00.000Z',
    }
    expect(
      await savePostForHook(42, { kind: 'video', payload: video })
    ).toMatchObject({ ok: true })
    expect(
      await savePostForHook(42, { postId: 12, kind: 'poll', payload: poll })
    ).toMatchObject({ ok: true })
    const refused: Array<[SavePostInput['kind'], PostWritePayload]> = [
      ['text', video],
      ['audio', video],
      ['video', { ...textPayload, audioId: 1 }],
      ['poll', textPayload],
      ['text', poll],
      ['poll', { ...poll, options: [{ option: '  ' }] }],
      ['poll', { ...poll, options: [{ option: 'x'.repeat(161) }] }],
    ]
    for (const [kind, payload] of refused) {
      expect(await savePostForHook(42, { kind, payload })).toMatchObject({
        ok: false,
        status: 400,
      })
    }
    expect(writes).toEqual([
      { method: 'POST', path: '/content/video', body: video },
      { method: 'PUT', path: '/content/poll/12', body: poll },
    ])
  })

  it('runs the Arvan upload through the API: init, chunk with its query, finalize', async () => {
    const chunks: Array<{ query: Record<string, string>; size: number }> = []
    server.use(
      http.post(
        `${apiOrigin}/content/upload/init`,
        recordWrite('POST', () =>
          ok({
            fileId: 'abc==',
            uploadUrl: 'https://napi.arvancloud.ir/vod/2.0/files/abc%3D%3D',
            uploadToken: 'upload-token',
          })
        )
      ),
      http.post(
        `${apiOrigin}/content/upload/chunk`,
        async ({ request: up }) => {
          expect(up.headers.get('authorization')).toBe(`Bearer ${token()}`)
          const body = await up.formData()
          const file = body.get('file')
          expect([...body.keys()]).toEqual(['file'])
          chunks.push({
            query: Object.fromEntries(new URL(up.url).searchParams),
            // MSW's parser makes its own File class, so no `instanceof`.
            size: typeof file === 'object' && file ? file.size : -1,
          })
          return ok('')
        }
      ),
      http.post(
        `${apiOrigin}/content/upload/finalize-video`,
        recordWrite('POST', () =>
          ok({
            id: 70,
            videoCloudId: 'v-1',
            videoCloudChannel: 'ch',
            fileNameCloud: 'clip.mp4',
            status: 'Converting',
          })
        )
      )
    )
    const start = { fileName: 'clip.mp4', fileSize: 3, fileType: 'video/mp4' }
    expect(await initMediaUploadForHook(42, start)).toEqual({
      ok: true,
      data: {
        fileId: 'abc==',
        uploadUrl: 'https://napi.arvancloud.ir/vod/2.0/files/abc%3D%3D',
        uploadToken: 'upload-token',
      },
    })
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(3)]), 'chunk')
    form.append(
      'uploadUrl',
      'https://napi.arvancloud.ir/vod/2.0/files/abc%3D%3D'
    )
    form.append('uploadToken', 'upload-token')
    form.append('offset', '0')
    expect(await uploadMediaChunkForHook(42, form)).toEqual({
      ok: true,
      data: null,
    })
    expect(chunks).toEqual([
      {
        query: {
          upload_url: 'https://napi.arvancloud.ir/vod/2.0/files/abc%3D%3D',
          upload_offset: '0',
          upload_token: 'upload-token',
        },
        size: 3,
      },
    ])
    expect(
      await finalizeMediaUploadForHook(42, {
        kind: 'video',
        fileId: 'abc==',
        uploadToken: 'upload-token',
      })
    ).toEqual({ ok: true, data: { id: 70, name: 'clip.mp4' } })
    expect(writes).toEqual([
      { method: 'POST', path: '/content/upload/init', body: start },
      {
        method: 'POST',
        path: '/content/upload/finalize-video',
        body: { file_id: 'abc==', upload_token: 'upload-token' },
      },
    ])
  })

  it('refuses a bad upload start or chunk before calling the API, and an init with no upload URL', async () => {
    let calls = 0
    server.use(
      http.post(`${apiOrigin}/content/upload/init`, () => {
        calls++
        return ok({ fileId: 'abc', uploadToken: 't' })
      }),
      http.post(`${apiOrigin}/content/upload/chunk`, () => {
        calls++
        return ok('')
      })
    )
    for (const start of [
      { fileName: 'a.svg', fileSize: 3, fileType: 'image/svg+xml' },
      { fileName: '  ', fileSize: 3, fileType: 'video/mp4' },
      { fileName: 'a.mp4', fileSize: 0, fileType: 'video/mp4' },
      { fileName: 'a.mp4', fileSize: 2 * 1024 ** 3 + 1, fileType: 'video/mp4' },
    ]) {
      expect(await initMediaUploadForHook(42, start)).toMatchObject({
        ok: false,
        status: 400,
      })
    }
    const chunk = (size: number, offset = '0') => {
      const form = new FormData()
      form.append('file', new Blob([new Uint8Array(size)]), 'chunk')
      form.append('uploadUrl', 'https://napi.arvancloud.ir/vod/2.0/files/a')
      form.append('uploadToken', 't')
      form.append('offset', offset)
      return form
    }
    for (const form of [chunk(0), chunk(4 * 1024 * 1024 + 1), chunk(1, '-1')]) {
      expect(await uploadMediaChunkForHook(42, form)).toMatchObject({
        ok: false,
        status: 400,
      })
    }
    expect(calls).toBe(0)
    expect(
      await initMediaUploadForHook(42, {
        fileName: 'a.mp4',
        fileSize: 3,
        fileType: 'video/mp4',
      })
    ).toMatchObject({ ok: false, code: 'INVALID_POST_RESPONSE' })
  })

  it('passes the API’s upload refusals through with their codes', async () => {
    server.use(
      http.post(`${apiOrigin}/content/upload/finalize-audio`, () =>
        HttpResponse.json(
          {
            data: null,
            errors: [
              { message: 'Upload not found', code: 'CONTENT_UPLOAD_NOT_FOUND' },
            ],
          },
          { status: 404 }
        )
      )
    )
    expect(
      await finalizeMediaUploadForHook(42, {
        kind: 'audio',
        fileId: 'abc',
        uploadToken: 'stale',
      })
    ).toMatchObject({
      ok: false,
      status: 404,
      code: 'CONTENT_UPLOAD_NOT_FOUND',
    })
  })
})
