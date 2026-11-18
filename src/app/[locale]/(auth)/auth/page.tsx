import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { AuthScreen } from '@/features/auth/components/auth-screen'
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
  return { title: t('phone.entry.title') }
}

export default async function AuthenticationPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  return <AuthScreen mode="entry" locale={locale} searchParams={searchParams} />
}
