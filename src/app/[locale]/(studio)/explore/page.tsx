import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'

import { getSession } from '@/features/auth/server/session'
import { ExploreView } from '@/features/explore/components/explore-view'

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  // The studio layout's SessionGate already requires a session here; the
  // viewer only narrows the list (their own page is left out). Whether
  // explore should also be reachable signed-out is a product question.
  const viewerId = await getSession().then(
    (session) => session?.user.id ?? null,
    () => null
  )
  return (
    <Suspense fallback={null}>
      <ExploreView viewerId={viewerId} />
    </Suspense>
  )
}
