'use client'

import { useTranslations } from 'next-intl'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * The reader's loading state, in the shape of the post it will show. A client
 * component, as `[locale]/loading.tsx` is: a loading shell has no params.
 */
export function PostReaderSkeleton() {
  const t = useTranslations('common')

  return (
    <div
      role="status"
      aria-label={t('loading')}
      className="mx-auto grid max-w-2xl gap-4"
    >
      <Skeleton className="h-4 w-32" />
      <Card className="gap-3 p-5">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </Card>
    </div>
  )
}
