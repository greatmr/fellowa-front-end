'use client'

import { SearchIcon, SearchXIcon, UsersIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { StudioPageHeader } from '@/components/layout/studio-page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useExploreCreatorsQuery } from '@/features/explore/api/explore-hooks'
import { CreatorCard } from '@/features/explore/components/creator-card'
import { MAX_ALIAS_SEARCH_LENGTH } from '@/features/explore/schemas/creator'
import type { ExploreCreator } from '@/features/explore/types/creator'

const SEARCH_DEBOUNCE_MS = 300

/**
 * Write `?q=` without a server round-trip: Next's `useSearchParams` follows
 * `history.replaceState`, so the query re-keys while the route stays put.
 */
function replaceSearchParam(value: string) {
  const url = new URL(window.location.href)
  if (value) url.searchParams.set('q', value)
  else url.searchParams.delete('q')
  window.history.replaceState(window.history.state, '', url)
}

/** Offset pages can overlap when rankings shift between requests. */
function uniqueById(items: ExploreCreator[]) {
  const seen = new Set<number>()
  return items.filter((item) => !seen.has(item.id) && seen.add(item.id))
}

/**
 * Explore (FE-EXPL-01; presentation `ExploreView` @ dc8467f). Ranked list by
 * default, alias search via `?q=`. Category chips and the interests card are
 * not ported: the API has no category filter or public category list, and
 * interests are out of scope (FQ-4).
 */
export function ExploreView({ viewerId }: { viewerId: number | null }) {
  const t = useTranslations('explore')
  const studio = useTranslations('studio')
  const searchParams = useSearchParams()
  const alias = (searchParams.get('q') ?? '')
    .trim()
    .slice(0, MAX_ALIAS_SEARCH_LENGTH)
  const [draft, setDraft] = useState(alias)
  const [syncedAlias, setSyncedAlias] = useState(alias)

  // The URL is the source of truth for the search, so it survives a reload.
  // When it changes from outside (Back, the sidebar link), the box follows it
  // instead of writing the old text back.
  if (alias !== syncedAlias) {
    setSyncedAlias(alias)
    if (draft.trim() !== alias) setDraft(alias)
  }

  useEffect(() => {
    const next = draft.trim()
    if (next === alias) return
    const timer = setTimeout(() => replaceSearchParam(next), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [alias, draft])

  const creators = useExploreCreatorsQuery(viewerId, alias)
  const items = uniqueById(
    creators.data?.pages.flatMap((page) => page.items) ?? []
  )

  function clearSearch() {
    setDraft('')
    replaceSearchParam('')
  }

  return (
    <>
      <StudioPageHeader
        title={studio('pages.explore.title')}
        category={studio('pages.explore.category')}
      />
      <p className="text-body text-muted-foreground">{t('description')}</p>

      <div className="relative mt-5">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-3.5 my-auto size-4 text-muted-foreground"
        />
        <Input
          type="search"
          value={draft}
          maxLength={MAX_ALIAS_SEARCH_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          aria-label={t('searchLabel')}
          placeholder={t('searchPlaceholder')}
          className="h-12 rounded-full ps-10"
        />
      </div>

      <div
        className="mt-5"
        aria-busy={creators.isPending || creators.isFetchingNextPage}
      >
        {creators.isPending ? (
          <ul
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label={t('loading')}
          >
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-52 rounded-md" />
              </li>
            ))}
          </ul>
        ) : creators.isError && items.length === 0 ? (
          <ErrorState
            title={t('errorTitle')}
            action={
              <Button variant="outline" onClick={() => creators.refetch()}>
                {t('retry')}
              </Button>
            }
          />
        ) : items.length === 0 ? (
          alias ? (
            <EmptyState
              icon={<SearchXIcon />}
              title={t('noResultsTitle')}
              action={
                <Button variant="ghost" onClick={clearSearch}>
                  {t('clearSearch')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<UsersIcon />}
              title={t('noCreatorsTitle')}
              description={t('noCreatorsBody')}
            />
          )
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((creator) => (
                <li key={creator.id} className="flex">
                  <CreatorCard creator={creator} />
                </li>
              ))}
            </ul>
            {creators.hasNextPage || creators.isFetchNextPageError ? (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  disabled={creators.isFetchingNextPage}
                  onClick={() => creators.fetchNextPage()}
                >
                  {creators.isFetchNextPageError
                    ? t('retry')
                    : creators.isFetchingNextPage
                      ? t('loadingMore')
                      : t('loadMore')}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
