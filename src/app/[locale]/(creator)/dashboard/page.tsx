import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageHeader } from '@/components/layout/page-header'
import { getSession } from '@/features/auth/server/session'
import { CreatorDashboard } from '@/features/dashboard/components/creator-dashboard'
import { loadDashboard } from '@/features/dashboard/server/load-dashboard'
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
  if (!session) {
    return redirect({ href: '/auth', locale: locale as Locale })
  }
  if (!session.user.isVerified) {
    return redirect({ href: '/auth/verify-email', locale: locale as Locale })
  }
  const [t, dashboard] = await Promise.all([
    getTranslations('panel'),
    loadDashboard(session),
  ])

  // The dashboard sets its own widths: full-width bands over a medium column.
  return (
    <CreatorDashboard
      {...dashboard}
      heading={
        <PageHeader title={t('pages.dashboard.title')} className="mb-0" />
      }
    />
  )
}
