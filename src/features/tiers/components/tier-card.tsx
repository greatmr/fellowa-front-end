'use client'

import { useFormatter, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import type { Tier } from '@/features/tiers/types/tier'

type Props = {
  tier: Tier
  onEdit: (tier: Tier) => void
  onDelete: (tier: Tier) => void
}

export function TierCard({ tier, onEdit, onDelete }: Props) {
  const t = useTranslations('tiers')
  const format = useFormatter()

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-5 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-subtitle font-bold text-foreground">
          {tier.title}
        </h2>
        <p className="text-body font-semibold text-primary">
          {format.number(tier.priceToman)} {t('toman')}
        </p>
        {tier.description ? (
          <p className="text-body-sm whitespace-pre-wrap text-muted-foreground">
            {tier.description}
          </p>
        ) : null}
      </div>
      {tier.benefits.length > 0 ? (
        <ul className="list-inside list-disc space-y-1 text-body-sm text-muted-foreground">
          {tier.benefits.map((benefit) => (
            <li key={benefit.id}>{benefit.title}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-auto flex gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(tier)}
        >
          {t('edit')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(tier)}
        >
          {t('delete')}
        </Button>
      </div>
    </article>
  )
}
