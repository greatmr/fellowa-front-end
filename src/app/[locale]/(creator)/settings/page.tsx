import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PageContainer } from '@/components/layout/page-container'
import { PageHeader } from '@/components/layout/page-header'
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
    return redirect({ href: '/auth', locale: locale as Locale })
  }
  const [t, settings] = await Promise.all([
    getTranslations('studio'),
    loadSettings(session),
  ])

  return (
    <PageContainer width="narrow">
      <SettingsView
        {...settings}
        heading={
          <PageHeader
            title={t('pages.settings.title')}
            category={t('pages.settings.category')}
          />
        }
      />
    </PageContainer>
  )
}
