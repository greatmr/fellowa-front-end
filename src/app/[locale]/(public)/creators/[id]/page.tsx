import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'

import {
  CreatorPageView,
  creatorPageTab,
} from '@/features/creator-page/components/creator-page-view'
import { loadCreatorPage } from '@/features/creator-page/server/load-creator-page'

/**
 * Public creator page (FE-PAGE-01), `/creators/:id` per C-9. Readable by
 * anyone; following or joining a tier asks an anonymous visitor to sign in.
 * `?tab=tiers` opens the Tiers tab (the post reader's gate, FE-CONT-01).
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ tab?: string | string[] }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const [data, { tab }] = await Promise.all([loadCreatorPage(id), searchParams])
  if (!data) notFound()

  return (
    <div className="mx-auto max-w-public px-4 py-8 sm:px-6 sm:py-10">
      <CreatorPageView {...data} initialTab={creatorPageTab(tab)} />
    </div>
  )
}
