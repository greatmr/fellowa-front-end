import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

/**
 * Wraps a product mock-up. The visible caption is what keeps its names and
 * prices from reading as real creators or real figures.
 */
export function SamplePreview({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const t = useTranslations('landing.sample')

  return (
    <figure className={cn('min-w-0', className)}>
      {children}
      <figcaption className="mt-5 text-center text-caption text-muted-foreground">
        {t('label')}
      </figcaption>
    </figure>
  )
}
