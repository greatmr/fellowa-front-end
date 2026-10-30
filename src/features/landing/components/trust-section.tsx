import {
  EyeIcon,
  MapPinIcon,
  ReceiptIcon,
  SlidersHorizontalIcon,
  type LucideIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

import { Reveal } from './reveal'

const CARDS: {
  key: 'control' | 'receipt' | 'benefits' | 'iran'
  icon: LucideIcon
  tint: string
  delay: string
}[] = [
  {
    key: 'control',
    icon: SlidersHorizontalIcon,
    tint: 'bg-brand-50 text-link dark:bg-brand-500/15',
    delay: '',
  },
  {
    key: 'receipt',
    icon: ReceiptIcon,
    tint: 'bg-money-50 text-money-600 dark:bg-money-500/15 dark:text-money-400',
    delay: 'delay-75',
  },
  {
    key: 'benefits',
    icon: EyeIcon,
    tint: 'bg-brand-50 text-link dark:bg-brand-500/15',
    delay: 'delay-150',
  },
  {
    key: 'iran',
    icon: MapPinIcon,
    tint: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
    delay: 'delay-200',
  },
]

export function TrustSection() {
  const t = useTranslations('landing.trust')

  return (
    <section
      aria-labelledby="landing-trust-title"
      className="bg-muted/40 py-20"
    >
      <div className="mx-auto max-w-public px-4 sm:px-6">
        <Reveal>
          <h2
            id="landing-trust-title"
            className="mb-12 text-center text-display font-bold tracking-tight text-foreground sm:text-4xl"
          >
            {t('title')}
          </h2>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-2">
          {CARDS.map(({ key, icon: Icon, tint, delay }) => (
            <Reveal key={key} className={delay}>
              <article className="h-full card-tactile rounded-card border bg-card p-6 shadow-soft">
                <span
                  className={cn(
                    'mb-4 flex size-11 items-center justify-center rounded-xl',
                    tint
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.9} aria-hidden />
                </span>
                <h3 className="mb-2 text-body-lg font-bold text-foreground">
                  {t(`${key}.title`)}
                </h3>
                <p className="text-body-sm leading-7 text-muted-foreground">
                  {t(`${key}.text`)}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
