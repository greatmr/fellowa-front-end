import { Suspense } from 'react'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
  AuthScreenFallback,
  PageAddressScreen,
} from '@/features/auth/components/auth-screen'
import { routing } from '@/i18n/routing'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('url.title') }
}

export default async function PageAddressPage({ params, searchParams }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  return (
    <Suspense fallback={<AuthScreenFallback />}>
      <PageAddressScreen locale={locale} searchParams={searchParams} />
    </Suspense>
  )
}
