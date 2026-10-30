'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import { listExploreCreatorsForHook } from '@/features/explore/server/actions'
import type { ExploreCreatorPage } from '@/features/explore/types/creator'
import { unwrapApiActionResult } from '@/lib/api/action-result'
import type { ApiError } from '@/lib/api/errors'

/**
 * The list depends on who is looking (their own page is left out), so the
 * viewer is part of the key; `null` is the anonymous list.
 */
export const exploreKeys = {
  all: ['explore'] as const,
  creators: (viewerId: number | null, alias: string) =>
    ['explore', 'creators', viewerId ?? 'anonymous', alias] as const,
}

export function useExploreCreatorsQuery(
  viewerId: number | null,
  alias: string
) {
  return useInfiniteQuery<
    ExploreCreatorPage,
    ApiError,
    { pages: ExploreCreatorPage[] },
    ReturnType<typeof exploreKeys.creators>,
    number
  >({
    queryKey: exploreKeys.creators(viewerId, alias),
    queryFn: async ({ pageParam }) =>
      unwrapApiActionResult(
        await listExploreCreatorsForHook(viewerId, { alias, page: pageParam })
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage ?? undefined,
  })
}
