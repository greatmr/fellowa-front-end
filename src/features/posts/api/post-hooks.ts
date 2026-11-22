'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query'

import {
  assignCollectionsForHook,
  createCollectionForHook,
  deleteCollectionForHook,
  listCollectionsForHook,
  setPostCollectionsForHook,
  updateCollectionForHook,
  deletePostAttachmentForHook,
  deletePostForHook,
  deletePostImageForHook,
  finalizeMediaUploadForHook,
  getPostForHook,
  initMediaUploadForHook,
  listPostsForHook,
  savePostForHook,
  setPostStatusForHook,
  uploadMediaChunkForHook,
  uploadPostAttachmentForHook,
  uploadPostImageForHook,
} from '@/features/posts/server/actions'
import {
  uploadMediaFile,
  type MediaUploadCancelledError,
  type MediaUploadProgress,
} from '@/features/posts/lib/media-upload'
import {
  chunk,
  runBulk,
  type BulkOutcome,
  type BulkProgress,
} from '@/features/posts/lib/bulk'
import { statusInput } from '@/features/posts/lib/post-draft'
import { MAX_COLLECTION_IDS } from '@/features/posts/schemas/collection'
import type {
  AssignCollectionsInput,
  CreateCollectionInput,
  OwnerCollection,
  PostCollections,
  SetPostCollectionsInput,
  UpdateCollectionInput,
} from '@/features/posts/types/collection'
import type {
  MediaUploadKind,
  PostFile,
  PostMedia,
  PostStatusInput,
  SavePostInput,
  OwnerPost,
} from '@/features/posts/types/post'
import {
  unwrapApiActionResult,
  type ApiActionResult,
} from '@/lib/api/action-result'
import type { ApiError } from '@/lib/api/errors'

export const postKeys = {
  all: ['posts'] as const,
  viewer: (viewerId: number) => ['posts', viewerId] as const,
  list: (viewerId: number) => ['posts', viewerId, 'list'] as const,
  detail: (viewerId: number, postId: number) =>
    ['posts', viewerId, 'detail', postId] as const,
  /** Under the viewer: every post write refreshes the counts too. */
  collections: (viewerId: number) =>
    ['posts', viewerId, 'collections'] as const,
  mutation: (name: string, viewerId: number) =>
    ['posts', 'mutation', name, viewerId] as const,
}

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables>,
  'mutationFn' | 'mutationKey'
>

const validId = (value: number) => Number.isSafeInteger(value) && value > 0

/**
 * The owner's own posts. `staleTime: 0`: the list changes with the owner's
 * own writes in other tabs, and draft or published state must not lag.
 */
export function usePostsQuery(viewerId: number) {
  return useQuery<OwnerPost[], ApiError>({
    queryKey: postKeys.list(viewerId),
    queryFn: async () =>
      unwrapApiActionResult(await listPostsForHook(viewerId)),
    enabled: validId(viewerId),
    staleTime: 0,
  })
}

export function usePostQuery(viewerId: number, postId: number) {
  return useQuery<OwnerPost, ApiError>({
    queryKey: postKeys.detail(viewerId, postId),
    queryFn: async () =>
      unwrapApiActionResult(await getPostForHook(viewerId, postId)),
    enabled: validId(viewerId) && validId(postId),
    staleTime: 0,
  })
}

/** A write that changes a post: every list and detail of this viewer refetches. */
function usePostMutation<TData, TVariables>(
  name: string,
  viewerId: number,
  action: (variables: TVariables) => Promise<ApiActionResult<TData>>,
  options?: MutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient()
  return useMutation<TData, ApiError, TVariables>({
    ...options,
    mutationKey: postKeys.mutation(name, viewerId),
    mutationFn: async (variables) =>
      unwrapApiActionResult(await action(variables)),
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: postKeys.viewer(viewerId),
      })
      await options?.onSuccess?.(data, variables, onMutateResult, context)
    },
  })
}

export function useSavePostMutation(
  viewerId: number,
  options?: MutationOptions<OwnerPost, SavePostInput>
) {
  return usePostMutation(
    'save',
    viewerId,
    (input: SavePostInput) => savePostForHook(viewerId, input),
    options
  )
}

export function useSetPostStatusMutation(
  viewerId: number,
  options?: MutationOptions<OwnerPost, PostStatusInput>
) {
  return usePostMutation(
    'status',
    viewerId,
    (input: PostStatusInput) => setPostStatusForHook(viewerId, input),
    options
  )
}

export function useDeletePostMutation(
  viewerId: number,
  options?: MutationOptions<null, number>
) {
  return usePostMutation(
    'delete',
    viewerId,
    (postId: number) => deletePostForHook(viewerId, postId),
    options
  )
}

export function useDeletePostImageMutation(viewerId: number) {
  return usePostMutation('deleteImage', viewerId, (imageId: number) =>
    deletePostImageForHook(viewerId, imageId)
  )
}

export type AttachmentUploadVariables = { postId: number; file: File }

/** The post id travels with each file: a new post's queue gets it on save. */
export function useUploadPostAttachmentMutation(viewerId: number) {
  return usePostMutation(
    'attachment',
    viewerId,
    ({ postId, file }: AttachmentUploadVariables) => {
      const form = new FormData()
      form.append('file', file)
      return uploadPostAttachmentForHook(viewerId, postId, form)
    }
  )
}

export function useDeletePostAttachmentMutation(viewerId: number) {
  return usePostMutation('deleteAttachment', viewerId, (id: number) =>
    deletePostAttachmentForHook(viewerId, id)
  )
}

/** Uploads only; the image joins a post when the post is saved. */
export function useUploadPostImageMutation(viewerId: number) {
  return useMutation<PostFile, ApiError, File>({
    mutationKey: postKeys.mutation('image', viewerId),
    mutationFn: async (image) => {
      const form = new FormData()
      form.append('image', image)
      return unwrapApiActionResult(await uploadPostImageForHook(viewerId, form))
    },
  })
}

export type MediaUploadVariables = {
  file: File
  kind: MediaUploadKind
  onProgress: (progress: MediaUploadProgress) => void
  isCancelled: () => boolean
}

/**
 * A video or audio, init → chunks → finalize; it joins a post when the post
 * is saved (`videoId` / `audioId`). One mutation for the whole upload, so the
 * composer's save waits for it (`postKeys.mutation('media', …)`).
 */
export function useUploadPostMediaMutation(viewerId: number) {
  return useMutation<
    PostMedia,
    ApiError | MediaUploadCancelledError,
    MediaUploadVariables
  >({
    mutationKey: postKeys.mutation('media', viewerId),
    mutationFn: ({ file, kind, onProgress, isCancelled }) =>
      uploadMediaFile(
        file,
        kind,
        {
          init: async (start) =>
            unwrapApiActionResult(
              await initMediaUploadForHook(viewerId, start)
            ),
          chunk: async (form) => {
            unwrapApiActionResult(await uploadMediaChunkForHook(viewerId, form))
          },
          finalize: async (finish) =>
            unwrapApiActionResult(
              await finalizeMediaUploadForHook(viewerId, finish)
            ),
        },
        { onProgress, isCancelled }
      ),
  })
}

// ---- Collections (BE-CONT-15) ----------------------------------------------

/**
 * The owner's collections. `staleTime: 0` as for the posts: counts change
 * with every post write, which invalidates the whole viewer key.
 */
export function useCollectionsQuery(viewerId: number) {
  return useQuery<OwnerCollection[], ApiError>({
    queryKey: postKeys.collections(viewerId),
    queryFn: async () =>
      unwrapApiActionResult(await listCollectionsForHook(viewerId)),
    enabled: validId(viewerId),
    staleTime: 0,
  })
}

export function useCreateCollectionMutation(
  viewerId: number,
  options?: MutationOptions<OwnerCollection, CreateCollectionInput>
) {
  return usePostMutation(
    'createCollection',
    viewerId,
    (input: CreateCollectionInput) => createCollectionForHook(viewerId, input),
    options
  )
}

export function useUpdateCollectionMutation(
  viewerId: number,
  options?: MutationOptions<OwnerCollection, UpdateCollectionInput>
) {
  return usePostMutation(
    'updateCollection',
    viewerId,
    (input: UpdateCollectionInput) => updateCollectionForHook(viewerId, input),
    options
  )
}

export function useDeleteCollectionMutation(
  viewerId: number,
  options?: MutationOptions<null, number>
) {
  return usePostMutation(
    'deleteCollection',
    viewerId,
    (collectionId: number) => deleteCollectionForHook(viewerId, collectionId),
    options
  )
}

/** Replace one post's collections (the row cell, the composer). */
export function useSetPostCollectionsMutation(
  viewerId: number,
  options?: MutationOptions<PostCollections, SetPostCollectionsInput>
) {
  return usePostMutation(
    'postCollections',
    viewerId,
    (input: SetPostCollectionsInput) =>
      setPostCollectionsForHook(viewerId, input),
    options
  )
}

/**
 * Bulk add: every post into every collection, in requests of at most 100
 * posts, one after another. A repeat is harmless (`ON CONFLICT DO NOTHING`),
 * so after a failure the whole selection can be sent again.
 */
export function useAssignCollectionsMutation(
  viewerId: number,
  options?: MutationOptions<PostCollections[], AssignCollectionsInput>
) {
  const queryClient = useQueryClient()
  return useMutation<PostCollections[], ApiError, AssignCollectionsInput>({
    ...options,
    mutationKey: postKeys.mutation('assignCollections', viewerId),
    mutationFn: async ({ postIds, collectionIds }) => {
      const results: PostCollections[] = []
      for (const ids of chunk(postIds, MAX_COLLECTION_IDS)) {
        results.push(
          ...unwrapApiActionResult(
            await assignCollectionsForHook(viewerId, {
              postIds: ids,
              collectionIds,
            })
          )
        )
      }
      return results
    },
    // Settled, not only succeeded: an earlier request may have gone through.
    onSettled: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: postKeys.viewer(viewerId),
      })
      await options?.onSettled?.(...args)
    },
  })
}

export type BulkAction = 'publish' | 'draft' | 'delete'

export type BulkVariables = {
  action: BulkAction
  posts: OwnerPost[]
  onProgress?: (progress: BulkProgress) => void
}

/**
 * Bulk publish, draft or delete through the per-post routes, at most
 * `BULK_CONCURRENCY` at a time. Resolves with every post's outcome; a post
 * that failed does not fail the batch. The list refetches once, at the end.
 */
export function useBulkPostsMutation(viewerId: number) {
  const queryClient = useQueryClient()
  return useMutation<BulkOutcome<OwnerPost>[], ApiError, BulkVariables>({
    mutationKey: postKeys.mutation('bulk', viewerId),
    mutationFn: ({ action, posts, onProgress }) =>
      runBulk(
        posts,
        async (post) => {
          unwrapApiActionResult(
            action === 'delete'
              ? await deletePostForHook(viewerId, post.id)
              : await setPostStatusForHook(viewerId, statusInput(post, action))
          )
        },
        { onProgress }
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: postKeys.viewer(viewerId) }),
  })
}
