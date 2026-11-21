import { setRequestLocale } from 'next-intl/server'

import { StudioPage } from '@/components/layout/studio-page'
import { getSession } from '@/features/auth/server/session'
import { PostComposer } from '@/features/posts/components/post-composer'
import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const session = await getSession()
  if (!session) return redirect({ href: '/auth', locale: locale as Locale })
  if (!session.user.isVerified) {
    return redirect({ href: '/auth/verify-email', locale: locale as Locale })
  }
  return (
    <StudioPage width="default">
      <PostComposer viewerId={session.user.id} saved={null} />
    </StudioPage>
  )
}
