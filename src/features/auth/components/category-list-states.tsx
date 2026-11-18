'use client'

import { LoaderCircleIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { AuthErrorLine } from './auth-error-line'

/**
 * The category list's own states on the sign-up steps that pick from it (the
 * interests and the page's category, FE-AUTH-08): chip-shaped placeholders
 * while it loads.
 */
export function CategoryListLoading({ className }: { className?: string }) {
  const t = useTranslations('common')
  return (
    <div
      role="status"
      aria-label={t('loading')}
      className={cn('flex flex-wrap gap-2.5', className)}
    >
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-10 w-24 rounded-full" />
      ))}
    </div>
  )
}

/**
 * A list that failed or came back empty: one error line and a retry. The
 * step's skip stays available beside it, so sign-up is never stuck here.
 */
export function CategoryListFailed({
  retrying,
  onRetry,
}: {
  retrying: boolean
  onRetry: () => void
}) {
  const t = useTranslations('auth.categoryList')
  const commonT = useTranslations('common')
  return (
    <div className="flex flex-col items-center gap-3">
      <AuthErrorLine role="alert" centered>
        {t('loadFailed')}
      </AuthErrorLine>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={retrying}
        onClick={onRetry}
      >
        {retrying && (
          <LoaderCircleIcon
            className="animate-spin motion-reduce:animate-none"
            aria-hidden
          />
        )}
        {commonT('retry')}
      </Button>
    </div>
  )
}
