import { getTranslations, setRequestLocale } from 'next-intl/server'

import { LandingPage } from '@/features/landing/components/landing-page'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'landing' })
  return { title: t('metaTitle') }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return <LandingPage />
}
