import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'

import { CreatorPageView } from '@/features/creator-page/components/creator-page-view'
import { loadCreatorPage } from '@/features/creator-page/server/load-creator-page'

/**
 * Public creator page (FE-PAGE-01), `/creators/:id` per C-9. Readable by
 * anyone; following or joining a tier asks an anonymous visitor to sign in.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const data = await loadCreatorPage(id)
  if (!data) notFound()

  return (
    <div className="mx-auto max-w-public px-4 py-8 sm:px-6 sm:py-10">
      <CreatorPageView {...data} />
    </div>
  )
}
