import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { LogoGlyph } from '@/components/layout/logo'
import { cn } from '@/lib/utils'

/**
 * The block every auth screen opens with (presentation auth screens @
 * fdb5f6c): the brand tile, the title and one line under it. The address step
 * uses the dark tile with its own glyph.
 */
export function AuthScreenHeading({
  title,
  description,
  tone = 'brand',
  className,
}: {
  title: ReactNode
  description?: ReactNode
  tone?: 'brand' | 'inverse'
  className?: string
}) {
  return (
    <div className={cn('text-center', className)}>
      <div className="mb-4 flex justify-center">
        <span
          aria-hidden
          className={cn(
            'flex size-12 items-center justify-center rounded-2xl shadow-xs',
            tone === 'brand'
              ? 'bg-primary text-primary-foreground'
              : 'bg-inverse text-inverse-foreground'
          )}
        >
          {tone === 'brand' ? (
            <LogoGlyph className="size-5.5" />
          ) : (
            <PageGlyph className="size-6" />
          )}
        </span>
      </div>
      <h1 className="mb-2 text-headline font-bold text-foreground">{title}</h1>
      {description ? (
        <p className="text-body leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )
}

/** The address step's glyph (presentation `OnboardingUrlScreen`). */
function PageGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c0 .83-.67 1.5-1.5 1.5S10 17.33 10 16.5V13c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v3.5zm0-7c0 .83-.67 1.5-1.5 1.5S10 10.33 10 9.5 10.67 8 11.5 8s1.5.67 1.5 1.5z"
        fill="currentColor"
      />
    </svg>
  )
}

/**
 * "Step x of y" over one bar per step, the done ones in the foreground colour
 * (presentation `AuthLayout`).
 */
export function AuthStepIndicator({
  current,
  total,
}: {
  current: number
  total: number
}) {
  const t = useTranslations('auth.layout')
  return (
    <div className="mb-6 w-full">
      <p className="mb-2 text-body-sm font-semibold text-muted-foreground">
        {t('progress', { current, total })}
      </p>
      <div
        role="progressbar"
        aria-label={t('progressLabel')}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        className="flex w-full gap-1.5"
      >
        {Array.from({ length: total }, (_, index) => (
          <div
            key={index}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              index < current ? 'bg-foreground' : 'bg-input'
            )}
          />
        ))}
      </div>
    </div>
  )
}
