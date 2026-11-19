import type { ReactNode } from 'react'
import { Check, Coins, Flame, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Money } from '@/components/common/money'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MIN_TIER_PRICE_TOMAN } from '@/features/tiers/schemas/tier'

type Props = {
  onStartGuide: () => void
  onCreate: () => void
}

/** No tiers yet (`TiersView` empty state @ d843c3b), without the demo toggle. */
export function TierEmptyState({ onStartGuide, onCreate }: Props) {
  const t = useTranslations('tiers.empty')
  const tPreview = useTranslations('tiers.preview')

  return (
    <Card className="p-6 sm:p-10">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div>
            <span className="mb-3 inline-block rounded-sm bg-secondary px-2.5 py-1 text-caption font-semibold text-secondary-foreground">
              {t('badge')}
            </span>
            <h2 className="text-title-sm leading-tight font-bold text-foreground sm:text-title">
              {t('title')}
            </h2>
            <p className="mt-2 text-label leading-6 text-muted-foreground sm:text-body">
              {t('body')}
            </p>
          </div>
          <ul className="space-y-4 pt-1">
            <ValueProp
              icon={<Coins />}
              title={t('incomeTitle')}
              body={t('incomeBody')}
            />
            <ValueProp
              icon={<Check strokeWidth={2.5} />}
              title={t('startTitle')}
              body={t('startBody')}
            />
            <ValueProp
              icon={<Flame />}
              title={t('communityTitle')}
              body={t('communityBody')}
            />
          </ul>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="button"
              variant="inverse"
              size="lg"
              onClick={onStartGuide}
            >
              {t('startGuide')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onCreate}
            >
              <Plus aria-hidden />
              {t('createDirect')}
            </Button>
          </div>
        </div>

        {/* A sample of the card supporters will see; illustration only. */}
        <div aria-hidden className="flex justify-center lg:col-span-5">
          <div className="w-full max-w-xs overflow-hidden rounded-md border bg-card shadow-md">
            <div className="flex h-32 w-full items-end bg-cover-brand p-4">
              <span className="rounded-sm bg-ink-900/50 px-2.5 py-0.5 text-micro font-semibold text-white">
                {t('sampleBadge')}
              </span>
            </div>
            <div className="p-5">
              <p className="text-subtitle font-semibold text-foreground">
                {t('sampleName')}
              </p>
              <p className="mt-1.5 flex items-baseline gap-1 text-foreground">
                <span className="numeric text-title-sm font-bold">
                  <Money amountToman={MIN_TIER_PRICE_TOMAN} />
                </span>
                <span className="text-label text-muted-foreground">
                  {tPreview('perMonth')}
                </span>
              </p>
              <div className="mt-4 flex w-full items-center justify-center rounded-md bg-inverse py-2.5 text-label font-semibold text-inverse-foreground">
                {tPreview('join')}
              </div>
              <div className="mt-4 space-y-2 border-t pt-3.5">
                <div className="h-2 w-full rounded-sm bg-muted" />
                <div className="h-2 w-4/5 rounded-sm bg-muted" />
                <div className="h-2 w-3/4 rounded-sm bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function ValueProp({
  icon,
  title,
  body,
}: {
  icon: ReactNode
  title: string
  body: string
}) {
  return (
    <li className="flex items-start gap-3.5">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground [&_svg]:size-4.5"
      >
        {icon}
      </span>
      <div>
        <h3 className="text-body font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-label leading-5 text-muted-foreground">
          {body}
        </p>
      </div>
    </li>
  )
}
