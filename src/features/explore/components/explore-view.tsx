'use client'

import { SearchIcon, SearchXIcon, UsersIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useExploreCreatorsQuery } from '@/features/explore/api/explore-hooks'
import { CreatorCard } from '@/features/explore/components/creator-card'
import { MAX_ALIAS_SEARCH_LENGTH } from '@/features/explore/schemas/creator'
import type {
  ExploreCategory,
  ExploreCreator,
} from '@/features/explore/types/creator'

const SEARCH_DEBOUNCE_MS = 300

/**
 * Write a filter to the URL without a server round-trip: Next's
 * `useSearchParams` follows `history.replaceState`, so the query re-keys
 * while the route stays put.
 */
function replaceSearchParams(changes: Record<'q' | 'category', string | null>) {
  const url = new URL(window.location.href)
  for (const [name, value] of Object.entries(changes)) {
    if (value) url.searchParams.set(name, value)
    else url.searchParams.delete(name)
  }
  window.history.replaceState(window.history.state, '', url)
}

/** Offset pages can overlap when rankings shift between requests. */
function uniqueById(items: ExploreCreator[]) {
  const seen = new Set<number>()
  return items.filter((item) => !seen.has(item.id) && seen.add(item.id))
}

/**
 * Explore (FE-EXPL-01; presentation `ExploreView` @ dc8467f), shared by the
 * signed-in studio explore and the public one. Ranked list by default, alias
 * search via `?q=`, category chips via `?category=` (BE-LAND-07/08). The
 * interests card is not ported (FQ-4). `viewerId` null is the anonymous list.
 */
export function ExploreView({
  viewerId,
  categories,
  heading,
}: {
  viewerId: number | null
  categories: ExploreCategory[]
  heading: ReactNode
}) {
  const t = useTranslations('explore')
  const searchParams = useSearchParams()
  const alias = (searchParams.get('q') ?? '')
    .trim()
    .slice(0, MAX_ALIAS_SEARCH_LENGTH)
  const requestedCategory = Number(searchParams.get('category'))
  // Only a category the backend listed is honoured; anything else is "all".
  const categoryId = categories.some((c) => c.id === requestedCategory)
    ? requestedCategory
    : null
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
    const timer = setTimeout(
      () =>
        replaceSearchParams({
          q: next || null,
          category: searchParams.get('category'),
        }),
      SEARCH_DEBOUNCE_MS
    )
    return () => clearTimeout(timer)
  }, [alias, draft, searchParams])

  const creators = useExploreCreatorsQuery(viewerId, alias, categoryId)
  const items = uniqueById(
    creators.data?.pages.flatMap((page) => page.items) ?? []
  )
  const categoryTitle = (id: number | null) =>
    categories.find((c) => c.id === id)?.title ?? null

  function selectCategory(id: number | null) {
    replaceSearchParams({
      q: alias || null,
      category: id === null ? null : String(id),
    })
  }

  function clearFilters() {
    setDraft('')
    replaceSearchParams({ q: null, category: null })
  }

  return (
    <>
      {heading}
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

      {categories.length > 0 ? (
        <div
          role="group"
          aria-label={t('categoriesLabel')}
          className="mt-4 flex flex-wrap gap-1.5"
        >
          {[{ id: null, title: t('allCategories') }, ...categories].map(
            (category) => {
              const selected = category.id === categoryId
              return (
                <Button
                  key={category.id ?? 'all'}
                  type="button"
                  size="sm"
                  variant={selected ? 'inverse' : 'outline'}
                  aria-pressed={selected}
                  onClick={() => selectCategory(category.id)}
                  className="h-8 rounded-full px-3.5"
                >
                  {category.title}
                </Button>
              )
            }
          )}
        </div>
      ) : null}

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
          alias || categoryId !== null ? (
            <EmptyState
              icon={<SearchXIcon />}
              title={t('noResultsTitle')}
              action={
                <Button variant="ghost" onClick={clearFilters}>
                  {t('clearFilters')}
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
                  <CreatorCard
                    creator={creator}
                    categoryTitle={categoryTitle(creator.categoryId)}
                  />
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
