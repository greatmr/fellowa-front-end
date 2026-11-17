import { cva, type VariantProps } from 'class-variance-authority'
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

/**
 * `default`: the studio sidebar's mark (presentation Sidebar header @
 * fdb5f6c). `auth`: the auth frame's larger solid tile, black wordmark and
 * hover lift (presentation `AuthLayout` @ 01fb04d); its hover follows the
 * nearest `group`, the link around it. `public`: the landing header and
 * footer's glowing tile and heavy wordmark (presentation `LandingView`
 * `.fw-logo` @ 798f660).
 */
const logoVariants = {
  tile: cva('flex items-center justify-center shadow-xs', {
    variants: {
      variant: {
        default: 'size-8 rounded-md bg-cover-mix text-white',
        auth: 'size-9 rounded-lg bg-primary text-primary-foreground transition-transform motion-safe:group-hover:scale-105',
        public: 'size-8 rounded-base bg-cover-mix text-white shadow-brand',
      },
    },
    defaultVariants: { variant: 'default' },
  }),
  glyph: cva('', {
    variants: {
      variant: { default: 'size-4.5', auth: 'size-5', public: 'size-4.5' },
    },
    defaultVariants: { variant: 'default' },
  }),
  wordmark: cva(
    'tracking-tight text-foreground group-data-[collapsed=true]/sidebar:sr-only',
    {
      variants: {
        variant: {
          default: 'text-subtitle font-bold',
          auth: 'text-title-sm font-black',
          public: 'text-title-sm font-black',
        },
      },
      defaultVariants: { variant: 'default' },
    }
  ),
}

/** Fellowa logo mark + wordmark. */
export function Logo({
  className,
  variant,
}: { className?: string } & VariantProps<typeof logoVariants.tile>) {
  const t = useTranslations('common')

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className={logoVariants.tile({ variant })} aria-hidden>
        <LogoGlyph className={logoVariants.glyph({ variant })} />
      </span>
      <span className={logoVariants.wordmark({ variant })}>{t('appName')}</span>
    </span>
  )
}
