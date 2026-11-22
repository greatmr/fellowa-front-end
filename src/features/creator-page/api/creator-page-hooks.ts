'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import type { CreatorListSource } from '@/features/creator-page/lib/sources'
import {
  listCreatorCollectionPostsAction,
  listCreatorPostsAction,
  listOwnPageCollectionPostsAction,
  listOwnPagePostsAction,
} from '@/features/creator-page/server/actions'
import type { CreatorPostPage } from '@/features/creator-page/types/creator-page'
import { unwrapApiActionResult } from '@/lib/api/action-result'
import type { ApiError } from '@/lib/api/errors'

/**
 * The public list is the same for every viewer (FQ-33 A): no viewer key. The
 * owner's preview (`ownPage`, BE-LAND-10) reads other routes, which answer an
 * unpublished page too, so it is keyed apart from the public list.
 */
export const creatorPageKeys = {
  posts: (creatorId: number, source: CreatorListSource = 'public') =>
    ['creator-page', creatorId, source, 'posts'] as const,
  collectionPosts: (
    creatorId: number,
    collectionId: number,
    source: CreatorListSource = 'public'
  ) =>
    [
      'creator-page',
      creatorId,
      source,
      'collections',
      collectionId,
      'posts',
    ] as const,
}

/**
 * The creator's public posts, page by page (Q-51). The first page is the one
 * the server rendered with the page; further pages load on "load more". The
 * list stays mounted while the page is open (the Posts panel is kept), so the
 * loaded pages live as long as the page does.
 */
export function useCreatorPostsQuery(
  creatorId: number,
  firstPage: CreatorPostPage,
  source: CreatorListSource = 'public'
) {
  return useInfiniteQuery<
    CreatorPostPage,
    ApiError,
    { pages: CreatorPostPage[] },
    ReturnType<typeof creatorPageKeys.posts>,
    number
  >({
    queryKey: creatorPageKeys.posts(creatorId, source),
    queryFn: async ({ pageParam }) => {
      const input = { creatorId, page: pageParam }
      return unwrapApiActionResult(
        await (source === 'ownPage'
          ? listOwnPagePostsAction(input)
          : listCreatorPostsAction(input))
      )
    },
    initialPageParam: 1,
    initialData: { pages: [firstPage], pageParams: [1] },
    // Dropped once the page unmounts: coming back starts again from the
    // first page the server just rendered, so the list and the counts beside
    // it agree, instead of reviving pages read minutes ago.
    gcTime: 0,
    getNextPageParam: (last) => last.nextPage ?? undefined,
  })
}

/**
 * One collection's public posts, page by page (BE-CONT-15), read when the
 * visitor opens the collection. Dropped once it closes, as the main list.
 */
export function useCreatorCollectionPostsQuery(
  creatorId: number,
  collectionId: number,
  source: CreatorListSource = 'public'
) {
  return useInfiniteQuery<
    CreatorPostPage,
    ApiError,
    { pages: CreatorPostPage[] },
    ReturnType<typeof creatorPageKeys.collectionPosts>,
    number
  >({
    queryKey: creatorPageKeys.collectionPosts(creatorId, collectionId, source),
    queryFn: async ({ pageParam }) => {
      const input = { creatorId, collectionId, page: pageParam }
      return unwrapApiActionResult(
        await (source === 'ownPage'
          ? listOwnPageCollectionPostsAction(input)
          : listCreatorCollectionPostsAction(input))
      )
    },
    initialPageParam: 1,
    gcTime: 0,
    getNextPageParam: (last) => last.nextPage ?? undefined,
  })
}
