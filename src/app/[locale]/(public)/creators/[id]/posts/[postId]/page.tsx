import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'

import { PostReaderView } from '@/features/post-reader/components/post-reader-view'
import { loadReaderPost } from '@/features/post-reader/server/load-reader-post'

/**
 * One post (FE-CONT-01), `/creators/:id/posts/:postId`. Rendered per request
 * for its viewer: the session cookie picks the signed-in or the anonymous
 * read, and the backend decides FULL, PARTIAL or TEASER. DENY is a 404.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string; postId: string }>
}) {
  const { locale, id, postId } = await params
  setRequestLocale(locale)
  const data = await loadReaderPost(id, postId)
  if (!data) notFound()

  return (
    <div className="mx-auto max-w-public px-4 py-8 sm:px-6 sm:py-10">
      <PostReaderView {...data} />
    </div>
  )
}
