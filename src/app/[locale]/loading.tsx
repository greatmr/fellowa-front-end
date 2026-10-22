'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from 'next-intl'

export default function Loading() {
  const t = useTranslations('common')

  return (
    <main
      id="main-content"
      tabIndex={-1}
      role="status"
      aria-label={t('loading')}
      className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-16"
    >
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </main>
  )
}
