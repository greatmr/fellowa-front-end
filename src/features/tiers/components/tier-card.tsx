'use client'

import Image from 'next/image'
import { Check, Edit3, MessageCircle, Users } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'

import { Money } from '@/components/common/money'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Tier } from '@/features/tiers/types/tier'

const VISIBLE_BENEFITS = 4

type Props = {
  tier: Tier
  onEdit: (tier: Tier) => void
}

/**
 * A tier in the owner's list (presentation `TiersView` grid @ d843c3b). The
 * cover is `GET /tire`'s `cover.url` (BE-TIER-07); no image when there is none.
 */
export function TierCard({ tier, onEdit }: Props) {
  const t = useTranslations('tiers')
  const format = useFormatter()
  const hidden = tier.benefits.length - VISIBLE_BENEFITS

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-md border bg-card shadow-xs">
      {tier.cover ? (
        <div className="relative h-32 w-full overflow-hidden bg-muted">
          {/* The bucket host is not in `images.remotePatterns`; served as is. */}
          <Image
            src={tier.cover.url}
            alt={t('card.coverAlt', { title: tier.title })}
            fill
            unoptimized
            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <h2 dir="auto" className="text-subtitle font-semibold text-foreground">
          {tier.title}
        </h2>
        <p className="mt-1 text-title-sm font-bold text-foreground">
          <span className="numeric">
            <Money amountToman={tier.priceToman} />
          </span>{' '}
          <span className="text-label font-normal text-muted-foreground">
            {t('preview.perMonth')}
          </span>
        </p>
        {tier.description ? (
          <p
            dir="auto"
            className="mt-2.5 line-clamp-2 text-label leading-5 text-muted-foreground"
          >
            {tier.description}
          </p>
        ) : null}
        {tier.benefits.length > 0 ? (
          <ul className="mt-4 flex-1 space-y-2 border-t pt-3 text-label leading-5 text-foreground">
            {tier.benefits.slice(0, VISIBLE_BENEFITS).map((benefit) => (
              <li key={benefit.id} className="flex items-start gap-2">
                <Check
                  aria-hidden
                  className="mt-0.5 size-3.5 shrink-0"
                  strokeWidth={2.5}
                />
                <span dir="auto" className="line-clamp-1">
                  {benefit.title}
                </span>
              </li>
            ))}
            {hidden > 0 ? (
              <li className="text-caption font-medium text-muted-foreground">
                {t('card.moreBenefits', { count: format.number(hidden) })}
              </li>
            ) : null}
          </ul>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {/* Owner-only (BE-TIER-06): pending and active seats, not members. */}
            <p className="numeric flex items-center gap-1.5 text-label text-muted-foreground">
              <Users aria-hidden className="size-3.5" />
              {tier.capacity === null
                ? t('card.seatsTaken', {
                    count: format.number(tier.seatsTaken),
                  })
                : t('card.seatsOfCapacity', {
                    count: format.number(tier.seatsTaken),
                    capacity: format.number(tier.capacity),
                  })}
            </p>
            {tier.chatEnabled ? (
              <Badge variant="neutral" className="rounded-sm px-2 text-micro">
                <MessageCircle aria-hidden />
                {t('preview.chat')}
              </Badge>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(tier)}
          >
            <Edit3 aria-hidden />
            {t('edit')}
          </Button>
        </div>
      </div>
    </article>
  )
}
