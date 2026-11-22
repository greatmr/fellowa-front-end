import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

/**
 * `POST /tire` and `POST /tire/cover` answer 400 `USER_ALIAS_REQUIRED` while
 * the caller has no page, as does the owner's preview (`/creator`,
 * BE-LAND-10). The address step (FE-ONB-02) returns to `returnTo`; `body`
 * replaces the tiers' explanation where another page shows the notice.
 */
export function AliasRequiredNotice({
  returnTo = '/tiers',
  body,
}: {
  returnTo?: string
  body?: string
}) {
  const t = useTranslations('tiers.aliasRequired')

  return (
    <div
      role="alert"
      className="grid justify-items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"
    >
      <div>
        <p className="text-label font-semibold text-foreground">{t('title')}</p>
        <p className="mt-1 text-label leading-5 text-muted-foreground">
          {body ?? t('body')}
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={{ pathname: '/auth/url', query: { returnTo } }}>
          {t('action')}
        </Link>
      </Button>
    </div>
  )
}
