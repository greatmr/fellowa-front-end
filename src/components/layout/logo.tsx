import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

/** The two-circle mark, in `currentColor`; size it with `className`. */
export function LogoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="9" cy="9" r="5" fill="currentColor" fillOpacity=".95" />
      <circle cx="15.5" cy="15" r="5" fill="currentColor" fillOpacity=".55" />
    </svg>
  )
}

/** Fellowa logo mark + wordmark (presentation Sidebar header, @fdb5f6c). */
export function Logo({ className }: { className?: string }) {
  const t = useTranslations('common')

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className="flex size-8 items-center justify-center rounded-md bg-cover-mix text-white shadow-xs"
        aria-hidden
      >
        <LogoGlyph className="size-4.5" />
      </span>
      <span className="text-subtitle font-bold tracking-tight text-foreground group-data-[collapsed=true]/sidebar:sr-only">
        {t('appName')}
      </span>
    </span>
  )
}
