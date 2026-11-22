import 'server-only'

import {
  parseAssigned,
  parseCollection,
  parseCollectionList,
  parsePostCollections,
} from '@/features/posts/schemas/collection'
import { parseDeleted } from '@/features/posts/schemas/post'
import type {
  AssignCollectionsInput,
  CreateCollectionInput,
  SetPostCollectionsInput,
  UpdateCollectionInput,
} from '@/features/posts/types/collection'
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  withBearer,
} from '@/lib/api/client'

/**
 * Collection routes (BE-CONT-15, back-end `773f88d`): the owner's, on the
 * page they own. A foreign id answers as a missing one (404).
 */

export async function listOwnCollections(token: string) {
  return parseCollectionList(
    await apiGet<unknown>('/content/collections', withBearer(token))
  )
}

export async function createCollection(
  token: string,
  input: CreateCollectionInput
) {
  return parseCollection(
    await apiPost<unknown>('/content/collections', input, withBearer(token))
  )
}

export async function updateCollection(
  token: string,
  input: UpdateCollectionInput
) {
  const { collectionId, ...body } = input
  return parseCollection(
    await apiPut<unknown>(
      `/content/collections/${collectionId}`,
      body,
      withBearer(token)
    )
  )
}

/** FQ-35: the links go, the posts stay. */
export async function deleteCollection(token: string, collectionId: number) {
  parseDeleted(
    await apiDelete<unknown>(
      `/content/collections/${collectionId}`,
      withBearer(token)
    )
  )
}

/** Replaces one post's collections (`[]` takes it out of all). */
export async function setPostCollections(
  token: string,
  input: SetPostCollectionsInput
) {
  return parsePostCollections(
    await apiPut<unknown>(
      `/content/${input.postId}/collections`,
      { collectionIds: input.collectionIds },
      withBearer(token)
    )
  )
}

/** Adds every post to every collection; nothing is removed. */
export async function assignCollections(
  token: string,
  input: AssignCollectionsInput
) {
  return parseAssigned(
    await apiPost<unknown>(
      '/content/collections/assign',
      input,
      withBearer(token)
    )
  )
}
