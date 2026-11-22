import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CreatorPageView } from '@/features/creator-page/components/creator-page-view'
import { creatorPageTab } from '@/features/creator-page/lib/tabs'
import { loadOwnCreatorPage } from '@/features/creator-page/server/load-own-creator-page'
import { AliasRequiredNotice } from '@/features/tiers'
import { redirect } from '@/i18n/navigation'

/**
 * The signed-in creator's own page (owner decision 2026-11-22, BE-LAND-10):
 * the page as visitors see it, published or not, with the owner's bar. Before
 * publication the bar offers publishing; the public `/creators/:id` stays the
 * visitor's view and is not redirected here. Signed out → sign in and back;
 * no username yet → the address step and back.
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ tab?: string | string[] }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const [result, { tab }] = await Promise.all([
    loadOwnCreatorPage(),
    searchParams,
  ])

  if (result.kind === 'signedOut') {
    return redirect({
      href: { pathname: '/auth', query: { returnTo: '/creator' } },
      locale,
    })
  }
  if (result.kind === 'unverified') {
    return redirect({ href: '/auth/verify-email', locale })
  }

  if (result.kind === 'noPage') {
    const t = await getTranslations('creatorPage.ownPage')
    return (
      <div className="mx-auto grid max-w-public gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-headline font-black tracking-tight text-foreground">
          {t('title')}
        </h1>
        <AliasRequiredNotice returnTo="/creator" body={t('noPageBody')} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-public px-4 py-8 sm:px-6 sm:py-10">
      <CreatorPageView {...result.data} initialTab={creatorPageTab(tab)} />
    </div>
  )
}
