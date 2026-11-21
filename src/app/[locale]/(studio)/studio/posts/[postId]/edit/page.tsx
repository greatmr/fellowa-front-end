import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'

import { StudioPage } from '@/components/layout/studio-page'
import { getSession } from '@/features/auth/server/session'
import { PostEditor } from '@/features/posts/components/post-editor'
import { parsePostIdParam } from '@/features/posts/lib/post-id-param'
import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; postId: string }>
}) {
  const { locale, postId: rawPostId } = await params
  setRequestLocale(locale)
  const postId = parsePostIdParam(rawPostId)
  if (postId === null) notFound()
  const session = await getSession()
  if (!session) return redirect({ href: '/auth', locale: locale as Locale })
  if (!session.user.isVerified) {
    return redirect({ href: '/auth/verify-email', locale: locale as Locale })
  }
  return (
    <StudioPage width="default">
      <PostEditor viewerId={session.user.id} postId={postId} />
    </StudioPage>
  )
}
