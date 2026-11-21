import { useFormatter, useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

/**
 * "n / max" under a text field with a length limit, in locale digits
 * (FE-TIER-03, FQ-26). The field's `maxLength` stops typing at the limit;
 * this only shows where the text stands. Point the field's
 * `aria-describedby` at `id`.
 */
export function CharCount({
  id,
  count,
  max,
  className,
}: {
  id: string
  count: number
  max: number
  className?: string
}) {
  const t = useTranslations('tiers.builder')
  const format = useFormatter()
  return (
    <p
      id={id}
      className={cn(
        'numeric mt-1.5 text-end text-caption text-muted-foreground',
        className
      )}
    >
      {t('charCount', {
        count: format.number(count),
        max: format.number(max),
      })}
    </p>
  )
}
