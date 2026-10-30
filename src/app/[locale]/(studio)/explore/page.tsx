import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'

import { StudioPageHeader } from '@/components/layout/studio-page-header'
import { getSession } from '@/features/auth/server/session'
import { loadExploreCategories } from '@/features/explore/server/categories'
import { ExploreView } from '@/features/explore/components/explore-view'

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('studio')
  // The studio layout's SessionGate already requires a session here; the
  // viewer only narrows the list (their own page is left out).
  const [viewerId, categories] = await Promise.all([
    getSession().then(
      (session) => session?.user.id ?? null,
      () => null
    ),
    loadExploreCategories(),
  ])
  return (
    <Suspense fallback={null}>
      <ExploreView
        viewerId={viewerId}
        categories={categories}
        heading={
          <StudioPageHeader
            title={t('pages.explore.title')}
            category={t('pages.explore.category')}
          />
        }
      />
    </Suspense>
  )
}
