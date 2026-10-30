import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'

import { loadExploreCategories } from '@/features/explore/server/categories'
import { ExploreView } from '@/features/explore/components/explore-view'

/**
 * Public explore (FE-EXPL-02; owner decision 2026-10-30): anyone can search
 * and open a creator's public page; anything further asks them to sign in.
 * The list is the anonymous one — the signed-in studio explore is `/explore`.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('explore')
  const categories = await loadExploreCategories()

  return (
    <div className="mx-auto max-w-public px-4 py-10 sm:px-6 sm:py-14">
      <Suspense fallback={null}>
        <ExploreView
          viewerId={null}
          categories={categories}
          heading={
            <h1 className="text-title font-extrabold text-foreground">
              {t('publicTitle')}
            </h1>
          }
        />
      </Suspense>
    </div>
  )
}
