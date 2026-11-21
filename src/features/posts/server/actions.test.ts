import { HttpResponse, http } from 'msw'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '../../../../test/msw/server'
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
  getPostForHook,
  listPostsForHook,
  savePostForHook,
  setPostStatusForHook,
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
})
