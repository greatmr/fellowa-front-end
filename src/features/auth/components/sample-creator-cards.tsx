import { CheckIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Money } from '@/components/common/money'
import { cn } from '@/lib/utils'

/**
 * The two stacked sample creator cards of the auth frame's visual column
 * (presentation `AuthLayout` @ fdb5f6c): a musician behind, a podcaster in
 * front, each with a tier, its monthly price and its benefits. Illustration
 * only, from static copy. Not ported: the cover photos (licence unknown);
 * the cards keep their gradients.
 */
export function SampleCreatorCards() {
  const t = useTranslations('auth.samples')

  return (
    <div className="relative h-120 w-full max-w-95">
      <div className="absolute start-4 top-0 w-80 rotate-3 rounded-card border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-xl transition-transform hover:rotate-1 rtl:-rotate-3 rtl:hover:-rotate-1">
        <Cover tag={t('musician.tag')} className="h-32 bg-auth-sample" />
        <Price
          tier={t('musician.tier')}
          amountToman={120000}
          perMonth={t('perMonth')}
          tone="glass"
        />
        <Benefits
          items={[t('musician.benefit1'), t('musician.benefit2')]}
          tone="glass"
        />
      </div>

      <div className="absolute end-2 bottom-4 w-82 -rotate-2 rounded-card border border-white bg-white/95 p-5 text-ink-900 shadow-panel backdrop-blur-xl transition-transform hover:rotate-0 rtl:rotate-2 rtl:hover:rotate-0">
        <Cover
          tag={t('podcaster.tag')}
          className="h-36 bg-linear-to-tr from-brand-600 to-violet-600"
          tagClassName="bg-brand-600 shadow-xs"
        />
        <Price
          tier={t('podcaster.tier')}
          amountToman={90000}
          perMonth={t('perMonth')}
          tone="solid"
        />
        <Benefits
          items={[
            t('podcaster.benefit1'),
            t('podcaster.benefit2'),
            t('podcaster.benefit3'),
          ]}
          tone="solid"
        />
      </div>
    </div>
  )
}

function Cover({
  tag,
  className,
  tagClassName = 'bg-black/60 backdrop-blur-sm',
}: {
  tag: string
  className: string
  tagClassName?: string
}) {
  return (
    <div
      className={cn(
        'relative mb-3.5 w-full overflow-hidden rounded-xl',
        className
      )}
    >
      <span
        className={cn(
          'absolute start-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-caption font-semibold text-white',
          tagClassName
        )}
      >
        {tag}
      </span>
    </div>
  )
}

function Price({
  tier,
  amountToman,
  perMonth,
  tone,
}: {
  tier: string
  amountToman: number
  perMonth: string
  tone: 'glass' | 'solid'
}) {
  const glass = tone === 'glass'
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <span
        className={
          glass
            ? 'text-body-sm font-medium text-white/80'
            : 'text-body-sm font-semibold text-ink-650'
        }
      >
        {tier}
      </span>
      <span
        className={
          glass
            ? 'text-body-lg font-bold text-white'
            : 'text-title-sm font-bold text-ink-900'
        }
      >
        <Money
          amountToman={amountToman}
          unitClassName={
            glass
              ? 'text-caption font-normal text-white/70'
              : 'text-caption font-normal text-ink-550'
          }
        />
        <span
          className={
            glass
              ? 'text-caption font-normal text-white/70'
              : 'text-caption font-normal text-ink-550'
          }
        >
          {perMonth}
        </span>
      </span>
    </div>
  )
}

function Benefits({
  items,
  tone,
}: {
  items: string[]
  tone: 'glass' | 'solid'
}) {
  return (
    <ul
      className={
        tone === 'glass'
          ? 'space-y-1.5 text-label text-white/75'
          : 'space-y-1.5 text-label text-ink-650'
      }
    >
      {items.map((item) => (
        <li key={item} className="flex items-center gap-1.5">
          <CheckIcon
            className="size-3.5 shrink-0 text-money-500"
            strokeWidth={tone === 'solid' ? 2.5 : 2}
            aria-hidden
          />
          {item}
        </li>
      ))}
    </ul>
  )
}
