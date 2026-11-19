import Image from 'next/image'
import { Check, MessageCircle, Users } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'

import { Money } from '@/components/common/money'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  /** `null` while the typed price is not yet a whole number. */
  priceToman: number | null
  description: string
  coverUrl: string | null
  benefits: string[]
  capacity: number | null
  chatEnabled: boolean
  className?: string
}

/**
 * The tier card as a supporter sees it (presentation `TiersView` live preview
 * @ d843c3b), drawn from the builder's unsaved state. Display only: the price
 * is the typed amount, formatted, never derived.
 */
export function TierPreviewCard({
  title,
  priceToman,
  description,
  coverUrl,
  benefits,
  capacity,
  chatEnabled,
  className,
}: Props) {
  const t = useTranslations('tiers.preview')
  const format = useFormatter()
  const name = title.trim()

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-xs overflow-hidden rounded-md border bg-card shadow-sm',
        className
      )}
    >
      {coverUrl ? (
        <div className="relative h-32 w-full overflow-hidden bg-muted">
          {/* The bucket host is not in `images.remotePatterns`; served as is. */}
          <Image
            src={coverUrl}
            alt=""
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="p-5">
        <h3
          dir="auto"
          className={cn(
            'truncate text-subtitle font-semibold',
            name ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {name || t('namePlaceholder')}
        </h3>
        <p className="mt-2 flex items-baseline gap-1.5">
          <span
            className={cn(
              'numeric text-title-sm font-bold',
              priceToman === null ? 'text-muted-foreground' : 'text-foreground'
            )}
          >
            <Money amountToman={priceToman ?? 0} />
          </span>
          <span className="text-caption font-medium text-muted-foreground">
            {t('perMonth')}
          </span>
        </p>
        {description.trim() ? (
          <p
            dir="auto"
            className="mt-3 text-label leading-5 whitespace-pre-wrap text-muted-foreground"
          >
            {description}
          </p>
        ) : null}
        {/* Not a control: the preview shows the supporter's button. */}
        <div
          aria-hidden
          className="mt-4 flex w-full items-center justify-center rounded-md bg-inverse py-2.5 text-label font-semibold text-inverse-foreground"
        >
          {t('join')}
        </div>
        {benefits.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t pt-3.5">
            {benefits.map((benefit, index) => (
              <li
                key={`${index}-${benefit}`}
                className="flex items-start gap-2 text-label leading-5 text-foreground"
              >
                <Check
                  aria-hidden
                  className="mt-1 size-3.5 shrink-0"
                  strokeWidth={2.5}
                />
                <span dir="auto">{benefit}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 border-t pt-3 text-center text-caption text-muted-foreground">
            {t('benefitsEmpty')}
          </p>
        )}
        {capacity !== null || chatEnabled ? (
          <div className="mt-3.5 flex flex-wrap gap-1.5 border-t pt-3">
            {capacity !== null ? (
              <Badge variant="amber" className="rounded-sm px-2 text-micro">
                <Users aria-hidden />
                {t('capacity', { count: format.number(capacity) })}
              </Badge>
            ) : null}
            {chatEnabled ? (
              <Badge variant="neutral" className="rounded-sm px-2 text-micro">
                <MessageCircle aria-hidden />
                {t('chat')}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
