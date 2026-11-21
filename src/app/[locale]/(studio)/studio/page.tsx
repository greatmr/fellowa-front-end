import { getTranslations, setRequestLocale } from 'next-intl/server'

import { StudioPageHeader } from '@/components/layout/studio-page-header'
import { getSession } from '@/features/auth/server/session'
import { StudioDashboard } from '@/features/studio/components/studio-dashboard'
import { loadDashboard } from '@/features/studio/server/load-dashboard'
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
    getTranslations('studio'),
    loadDashboard(session),
  ])

  // The dashboard sets its own widths: full-width bands over a medium column.
  return (
    <StudioDashboard
      {...dashboard}
      heading={
        <StudioPageHeader
          title={t('pages.dashboard.title')}
          category={t('pages.dashboard.category')}
          className="mb-0"
        />
      }
    />
  )
}
