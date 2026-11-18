import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { AccountScreen } from '@/features/auth/components/auth-screen'
import { routing } from '@/i18n/routing'

// Moving between auth steps keeps the current one on screen until this one
// has rendered (the auth layout's Suspense boundary), never a fallback.
export const instant = false

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('phone.account.title') }
}

export default async function CompleteAccountPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  return <AccountScreen locale={locale} searchParams={searchParams} />
}
