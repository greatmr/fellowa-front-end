import { getTranslations, setRequestLocale } from 'next-intl/server'

import { StudioPageHeader } from '@/components/layout/studio-page-header'
import { getSession } from '@/features/auth/server/session'
import { SettingsView } from '@/features/settings/components/settings-view'
import { loadSettings } from '@/features/settings/server/load-settings'
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
    return redirect({ href: '/auth/login', locale: locale as Locale })
  }
  const [t, settings] = await Promise.all([
    getTranslations('studio'),
    loadSettings(session),
  ])

  return (
    <SettingsView
      {...settings}
      heading={
        <StudioPageHeader
          title={t('pages.settings.title')}
          category={t('pages.settings.category')}
        />
      }
    />
  )
}
