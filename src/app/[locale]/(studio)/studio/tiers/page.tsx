import { setRequestLocale } from 'next-intl/server'

import { getSession } from '@/features/auth/server/session'
import { TierManager } from '@/features/tiers/components/tier-manager'
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
  if (!session)
    return redirect({ href: '/auth/login', locale: locale as Locale })
  if (!session.user.isVerified) {
    return redirect({ href: '/auth/verify-email', locale: locale as Locale })
  }
  return <TierManager viewerId={session.user.id} />
}
