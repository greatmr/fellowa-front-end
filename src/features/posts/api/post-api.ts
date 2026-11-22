import 'server-only'

import {
  parseDeleted,
  parseFinalizedMedia,
  parsePost,
  parsePostList,
  parseUploadChunk,
  parseUploadSession,
  parseUploadedFile,
} from '@/features/posts/schemas/post'
import type {
  MediaUploadFinish,
  MediaUploadStart,
  PostStatusInput,
  SavePostInput,
} from '@/features/posts/types/post'
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  withBearer,
} from '@/lib/api/client'

/**
 * Content routes (back-end `content.controller.ts`, `acffdb2`). Every one is
 * the owner's: the JWT user, through the page they own.
 */

/**
 * An upload goes Next → API → object storage before the API answers; the
 * client's 20 s default is too short for 10 MB on a slow link (as for tier
 * covers, FE-TIER-04, [PROP] 60 s). Uploads only.
 */
export const POST_UPLOAD_TIMEOUT_MS = 60_000

export async function listOwnPosts(token: string) {
  return parsePostList(await apiGet<unknown>('/content', withBearer(token)))
}

export async function getOwnPost(token: string, postId: number) {
  return parsePost(
    await apiGet<unknown>(`/content/${postId}`, withBearer(token))
  )
}

/**
 * One chunk goes Next → API → Arvan before the API answers; 4 MB at
 * 256 kbit/s is about two minutes ([PROP] 180 s, `MEDIA_CHUNK_BYTES`).
 */
export const MEDIA_CHUNK_TIMEOUT_MS = 180_000

/** `POST /content/{kind}` or `PUT /content/{kind}/:id`. */
export async function savePost(token: string, input: SavePostInput) {
  const path =
    input.postId === undefined
      ? `/content/${input.kind}`
      : `/content/${input.kind}/${input.postId}`
  const send = input.postId === undefined ? apiPost : apiPut
  return parsePost(await send<unknown>(path, input.payload, withBearer(token)))
}

/**
 * Publish or unpublish through `PUT /content/text/:id`, whatever the post
 * holds: the route leaves the body (no `text`), the media and the tier links
 * (no `tireIds`) as they are, and is the one api.md says goes through on a
 * poll with votes.
 */
export async function setPostStatus(token: string, input: PostStatusInput) {
  const { postId, ...body } = input
  return parsePost(
    await apiPut<unknown>(`/content/text/${postId}`, body, withBearer(token))
  )
}

export async function deletePost(token: string, postId: number) {
  parseDeleted(
    await apiDelete<unknown>(`/content/${postId}`, withBearer(token))
  )
}

/** `POST /content/image-file`: multipart, field `image`. Not yet on a post. */
export async function uploadPostImage(token: string, image: File) {
  const body = new FormData()
  body.append('image', image, image.name)
  return parseUploadedFile(
    await apiPost<unknown, FormData>('/content/image-file', body, {
      ...withBearer(token),
      timeout: POST_UPLOAD_TIMEOUT_MS,
    })
  )
}

/** `DELETE /content/image-file/:id`: only an image already on a post. */
export async function deletePostImage(token: string, imageId: number) {
  parseDeleted(
    await apiDelete<unknown>(
      `/content/image-file/${imageId}`,
      withBearer(token)
    )
  )
}

/** `POST /content/:id/attachment`: multipart, field `file`. */
export async function uploadPostAttachment(
  token: string,
  postId: number,
  file: File
) {
  const body = new FormData()
  body.append('file', file, file.name)
  return parseUploadedFile(
    await apiPost<unknown, FormData>(`/content/${postId}/attachment`, body, {
      ...withBearer(token),
      timeout: POST_UPLOAD_TIMEOUT_MS,
    })
  )
}

export async function deletePostAttachment(
  token: string,
  attachmentId: number
) {
  parseDeleted(
    await apiDelete<unknown>(
      `/content/attachment/${attachmentId}`,
      withBearer(token)
    )
  )
}

/** `POST /content/upload/init`: starts an Arvan upload; validated there (O-6). */
export async function initMediaUpload(token: string, start: MediaUploadStart) {
  return parseUploadSession(
    await apiPost<unknown>('/content/upload/init', start, withBearer(token))
  )
}

/**
 * `POST /content/upload/chunk?upload_url=&upload_offset=&upload_token=`:
 * multipart with the bytes as its one part, `file`.
 */
export async function uploadMediaChunk(
  token: string,
  query: { uploadUrl: string; offset: string; uploadToken: string },
  bytes: Blob
) {
  const body = new FormData()
  body.append('file', bytes, 'chunk')
  parseUploadChunk(
    await apiPost<unknown, FormData>('/content/upload/chunk', body, {
      ...withBearer(token),
      params: {
        upload_url: query.uploadUrl,
        upload_offset: query.offset,
        upload_token: query.uploadToken,
      },
      timeout: MEDIA_CHUNK_TIMEOUT_MS,
    })
  )
}

/** `POST /content/upload/finalize-{video|audio}`: the media's id to attach. */
export async function finalizeMediaUpload(
  token: string,
  finish: MediaUploadFinish
) {
  return parseFinalizedMedia(
    await apiPost<unknown>(
      `/content/upload/finalize-${finish.kind}`,
      { file_id: finish.fileId, upload_token: finish.uploadToken },
      { ...withBearer(token), timeout: POST_UPLOAD_TIMEOUT_MS }
    )
  )
}
