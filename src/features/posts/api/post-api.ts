import 'server-only'

import {
  parseDeleted,
  parsePost,
  parsePostList,
  parseUploadedFile,
} from '@/features/posts/schemas/post'
import type {
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

/** `POST /content/{text|image}` or `PUT /content/{text|image}/:id`. */
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
