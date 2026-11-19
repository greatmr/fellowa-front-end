import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

/**
 * `POST /tire` and `POST /tire/cover` answer 400 `USER_ALIAS_REQUIRED` while
 * the caller has no page. The address step (FE-ONB-02) returns here.
 */
export function AliasRequiredNotice() {
  const t = useTranslations('tiers.aliasRequired')

  return (
    <div
      role="alert"
      className="grid justify-items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"
    >
      <div>
        <p className="text-label font-semibold text-foreground">{t('title')}</p>
        <p className="mt-1 text-label leading-5 text-muted-foreground">
          {t('body')}
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link
          href={{ pathname: '/auth/url', query: { returnTo: '/studio/tiers' } }}
        >
          {t('action')}
        </Link>
      </Button>
    </div>
  )
}
