import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AuthScreenFallback } from '@/features/auth/components/auth-screen'
import { OnboardingScreen } from '@/features/onboarding/components/onboarding-screen'
import { routing } from '@/i18n/routing'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'onboarding' })
  return { title: t('metaTitle') }
}

export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  return (
    <Suspense fallback={<AuthScreenFallback />}>
      <OnboardingScreen locale={locale} />
    </Suspense>
  )
}
