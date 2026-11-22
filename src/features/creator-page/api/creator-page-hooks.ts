'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import { listCreatorPostsAction } from '@/features/creator-page/server/actions'
import type { CreatorPostPage } from '@/features/creator-page/types/creator-page'
import { unwrapApiActionResult } from '@/lib/api/action-result'
import type { ApiError } from '@/lib/api/errors'

/** The public list is the same for every viewer (FQ-33 A): no viewer key. */
export const creatorPageKeys = {
  posts: (creatorId: number) => ['creator-page', creatorId, 'posts'] as const,
}

/**
 * The creator's public posts, page by page (Q-51). The first page is the one
 * the server rendered with the page; further pages load on "load more". The
 * list stays mounted while the page is open (the Posts panel is kept), so the
 * loaded pages live as long as the page does.
 */
export function useCreatorPostsQuery(
  creatorId: number,
  firstPage: CreatorPostPage
) {
  return useInfiniteQuery<
    CreatorPostPage,
    ApiError,
    { pages: CreatorPostPage[] },
    ReturnType<typeof creatorPageKeys.posts>,
    number
  >({
    queryKey: creatorPageKeys.posts(creatorId),
    queryFn: async ({ pageParam }) =>
      unwrapApiActionResult(
        await listCreatorPostsAction({ creatorId, page: pageParam })
      ),
    initialPageParam: 1,
    initialData: { pages: [firstPage], pageParams: [1] },
    // Dropped once the page unmounts: coming back starts again from the
    // first page the server just rendered, so the list and the counts beside
    // it agree, instead of reviving pages read minutes ago.
    gcTime: 0,
    getNextPageParam: (last) => last.nextPage ?? undefined,
  })
}
