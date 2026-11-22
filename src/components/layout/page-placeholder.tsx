import { ConstructionIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/layout/page-header'

export type PanelPage =
  | 'dashboard'
  | 'page'
  | 'posts'
  | 'composer'
  | 'tiers'
  | 'audience'
  | 'payouts'
  | 'payments'
  | 'settings'
  | 'explore'
  | 'feed'
  | 'chats'
  | 'notifications'

/**
 * Stand-in body for a studio route whose screen is a later FE-… task. It
 * renders the real page title so the frame can be reviewed, and says plainly
 * that the screen is not built — never fake data.
 */
export function PagePlaceholder({ page }: { page: PanelPage }) {
  const t = useTranslations('studio')

  return (
    <>
      <PageHeader
        title={t(`pages.${page}.title`)}
        category={t(`pages.${page}.category`)}
      />
      <EmptyState
        icon={<ConstructionIcon />}
        title={t('placeholder.title')}
        description={t('placeholder.body')}
      />
    </>
  )
}
