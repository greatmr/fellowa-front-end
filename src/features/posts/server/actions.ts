'use server'

import { readSession, validAuthRequestOrigin } from '@/features/auth/server'
import {
  deletePost,
  deletePostAttachment,
  deletePostImage,
  finalizeMediaUpload,
  getOwnPost,
  initMediaUpload,
  listOwnPosts,
  savePost,
  setPostStatus,
  uploadMediaChunk,
  uploadPostAttachment,
  uploadPostImage,
} from '@/features/posts/api/post-api'
import {
  MAX_POST_ATTACHMENT_BYTES,
  MAX_POST_IMAGE_BYTES,
  POST_ATTACHMENT_TYPES,
  POST_IMAGE_TYPES,
  fileProblem,
} from '@/features/posts/lib/upload-limits'
import { MEDIA_CHUNK_BYTES } from '@/features/posts/lib/media-upload-limits'
import {
  InvalidPostResponseError,
  mediaChunkFieldsSchema,
  mediaUploadFinishSchema,
  mediaUploadStartSchema,
  postIdSchema,
  postStatusSchema,
  savePostSchema,
} from '@/features/posts/schemas/post'
import type {
  MediaUploadFinish,
  MediaUploadSession,
  MediaUploadStart,
  PostFile,
  PostMedia,
  PostStatusInput,
  SavePostInput,
  OwnerPost,
} from '@/features/posts/types/post'
import { runApiAction, type ApiActionResult } from '@/lib/api/action-result'
import { ApiError } from '@/lib/api/errors'

function execute<T>(operation: () => Promise<T>) {
  return runApiAction(operation, (error) =>
    error instanceof InvalidPostResponseError
      ? { code: 'INVALID_POST_RESPONSE' }
      : undefined
  )
}

/** The session's token, for the account the page rendered for only. */
async function authorizedToken(viewerId: number): Promise<string> {
  const session = await readSession()
  if (!session) throw new ApiError({ message: 'Session expired', status: 401 })
  if (session.user.id !== viewerId || !session.user.isVerified) {
    throw new ApiError({ message: 'Forbidden', status: 403 })
  }
  return session.token
}

async function mutation<T>(
  operation: () => Promise<T>
): Promise<ApiActionResult<T>> {
  if (!(await validAuthRequestOrigin())) {
    return { ok: false, status: 403, code: 'INVALID_REQUEST' }
  }
  return execute(operation)
}

function invalidPost(): never {
  throw new ApiError({ message: 'Invalid post', status: 400 })
}

const invalidRequest = {
  ok: false,
  status: 400,
  code: 'INVALID_REQUEST',
} as const

function validId(value: unknown): value is number {
  return postIdSchema.safeParse(value).success
}

export async function listPostsForHook(
  viewerId: number
): Promise<ApiActionResult<OwnerPost[]>> {
  if (!validId(viewerId)) return invalidRequest
  return execute(async () => listOwnPosts(await authorizedToken(viewerId)))
}

export async function getPostForHook(
  viewerId: number,
  postId: number
): Promise<ApiActionResult<OwnerPost>> {
  if (!validId(viewerId) || !validId(postId)) return invalidRequest
  return execute(async () =>
    getOwnPost(await authorizedToken(viewerId), postId)
  )
}

export async function savePostForHook(
  viewerId: number,
  input: SavePostInput
): Promise<ApiActionResult<OwnerPost>> {
  return mutation(async () => {
    const parsed = savePostSchema.safeParse(input)
    if (!parsed.success) invalidPost()
    return savePost(await authorizedToken(viewerId), parsed.data)
  })
}

export async function setPostStatusForHook(
  viewerId: number,
  input: PostStatusInput
): Promise<ApiActionResult<OwnerPost>> {
  return mutation(async () => {
    const parsed = postStatusSchema.safeParse(input)
    if (!parsed.success) invalidPost()
    return setPostStatus(await authorizedToken(viewerId), parsed.data)
  })
}

export async function deletePostForHook(
  viewerId: number,
  postId: number
): Promise<ApiActionResult<null>> {
  return mutation(async () => {
    if (!validId(postId)) invalidPost()
    await deletePost(await authorizedToken(viewerId), postId)
    return null
  })
}

function formFile(
  form: FormData,
  field: string,
  types: readonly string[],
  maxBytes: number
): File {
  const file = form.get(field)
  if (!(file instanceof File) || fileProblem(file, types, maxBytes)) {
    invalidPost()
  }
  return file
}

export async function uploadPostImageForHook(
  viewerId: number,
  form: FormData
): Promise<ApiActionResult<PostFile>> {
  return mutation(async () => {
    const image = formFile(
      form,
      'image',
      POST_IMAGE_TYPES,
      MAX_POST_IMAGE_BYTES
    )
    return uploadPostImage(await authorizedToken(viewerId), image)
  })
}

export async function deletePostImageForHook(
  viewerId: number,
  imageId: number
): Promise<ApiActionResult<null>> {
  return mutation(async () => {
    if (!validId(imageId)) invalidPost()
    await deletePostImage(await authorizedToken(viewerId), imageId)
    return null
  })
}

export async function uploadPostAttachmentForHook(
  viewerId: number,
  postId: number,
  form: FormData
): Promise<ApiActionResult<PostFile>> {
  return mutation(async () => {
    if (!validId(postId)) invalidPost()
    const file = formFile(
      form,
      'file',
      POST_ATTACHMENT_TYPES,
      MAX_POST_ATTACHMENT_BYTES
    )
    return uploadPostAttachment(await authorizedToken(viewerId), postId, file)
  })
}

export async function deletePostAttachmentForHook(
  viewerId: number,
  attachmentId: number
): Promise<ApiActionResult<null>> {
  return mutation(async () => {
    if (!validId(attachmentId)) invalidPost()
    await deletePostAttachment(await authorizedToken(viewerId), attachmentId)
    return null
  })
}

export async function initMediaUploadForHook(
  viewerId: number,
  start: MediaUploadStart
): Promise<ApiActionResult<MediaUploadSession>> {
  return mutation(async () => {
    const parsed = mediaUploadStartSchema.safeParse(start)
    if (!parsed.success) invalidPost()
    return initMediaUpload(await authorizedToken(viewerId), parsed.data)
  })
}

/** One chunk: `file` (≤ `MEDIA_CHUNK_BYTES`), `uploadUrl`, `uploadToken`, `offset`. */
export async function uploadMediaChunkForHook(
  viewerId: number,
  form: FormData
): Promise<ApiActionResult<null>> {
  return mutation(async () => {
    const bytes = form.get('file')
    const fields = mediaChunkFieldsSchema.safeParse({
      uploadUrl: form.get('uploadUrl'),
      uploadToken: form.get('uploadToken'),
      offset: form.get('offset'),
    })
    if (
      !(bytes instanceof Blob) ||
      bytes.size === 0 ||
      bytes.size > MEDIA_CHUNK_BYTES ||
      !fields.success
    ) {
      invalidPost()
    }
    await uploadMediaChunk(await authorizedToken(viewerId), fields.data, bytes)
    return null
  })
}

export async function finalizeMediaUploadForHook(
  viewerId: number,
  finish: MediaUploadFinish
): Promise<ApiActionResult<PostMedia>> {
  return mutation(async () => {
    const parsed = mediaUploadFinishSchema.safeParse(finish)
    if (!parsed.success) invalidPost()
    return finalizeMediaUpload(await authorizedToken(viewerId), parsed.data)
  })
}
