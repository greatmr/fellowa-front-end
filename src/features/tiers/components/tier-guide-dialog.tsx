'use client'

import { useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, Coins, Layers } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'

import { useFormatMoney } from '@/components/common/money'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TierPreviewCard } from '@/features/tiers/components/tier-preview-card'
import { roleTitle } from '@/features/tiers/lib/role-title'
import {
  MIN_TIER_PRICE_TOMAN,
  TIER_PRICE_SHORTCUTS,
} from '@/features/tiers/schemas/tier'
import type { TierRole } from '@/features/tiers/types/tier'
import { cn } from '@/lib/utils'

export type GuideResult = {
  title: string
  description: string
  price: number
  benefits: { title: string; roleId: number }[]
}

type RolesState = {
  data: TierRole[] | undefined
  isPending: boolean
  isError: boolean
  refetch: () => unknown
}

type Props = {
  open: boolean
  roles: RolesState
  onFinish: (result: GuideResult) => void
  onClose: () => void
}

/** The prototype preselects three suggestions. */
const DEFAULT_PICKS = 3
const STEPS = 2

/**
 * The two-step setup guide (`TiersView` @ d843c3b): perks from `GET /tire/role`,
 * then a starting price from the same five amounts as the builder's chips
 * (FQ-12). It only prefills the builder; nothing is saved here. Mount with a
 * `key` per opening so it starts fresh.
 */
export function TierGuideDialog({ open, roles, onFinish, onClose }: Props) {
  const t = useTranslations('tiers.guide')
  const tTiers = useTranslations('tiers')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const format = useFormatter()
  const formatMoney = useFormatMoney()
  const [step, setStep] = useState<1 | 2>(1)
  // `null` until the creator touches the list: the first three are picked.
  const [picked, setPicked] = useState<number[] | null>(null)
  const [price, setPrice] = useState<number>(MIN_TIER_PRICE_TOMAN)

  const catalog = roles.data ?? []
  const pickedIds =
    picked ?? catalog.slice(0, DEFAULT_PICKS).map((role) => role.id)
  const pickedRoles = catalog.filter((role) => pickedIds.includes(role.id))
  const benefits = pickedRoles.map((role) => ({
    title: roleTitle(role, locale),
    roleId: role.id,
  }))

  function toggle(id: number, checked: boolean) {
    setPicked(
      checked
        ? [...pickedIds, id]
        : pickedIds.filter((pickedId) => pickedId !== id)
    )
  }

  const preview = (
    <TierPreviewCard
      title={t('defaultName')}
      priceToman={price}
      description=""
      coverUrl={null}
      benefits={benefits.map((benefit) => benefit.title)}
      capacity={null}
      chatEnabled={false}
    />
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent
        closeLabel={tCommon('close')}
        className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"
      >
        <DialogHeader className="flex-row flex-wrap items-center gap-2.5 border-b pb-4">
          <Badge variant="neutral">
            {t('step', {
              step: format.number(step),
              total: format.number(STEPS),
            })}
          </Badge>
          <DialogTitle className="text-label font-normal text-muted-foreground">
            {t('title')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {step === 1 ? (
            <div className="space-y-4 lg:col-span-7">
              <div>
                <h3 className="text-title-sm font-semibold text-foreground">
                  {t('perksTitle')}
                </h3>
                <p className="mt-1.5 text-label leading-relaxed text-muted-foreground">
                  {t('perksBody')}
                </p>
              </div>
              <p className="text-label font-semibold text-foreground">
                {t('perksLabel')}
              </p>
              {roles.isPending ? (
                <p role="status" className="text-body-sm text-muted-foreground">
                  {tCommon('loading')}
                </p>
              ) : roles.isError ? (
                <p role="alert" className="text-body-sm text-destructive">
                  {tTiers('rolesError')}{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void roles.refetch()}
                  >
                    {tCommon('retry')}
                  </button>
                </p>
              ) : (
                <ul className="max-h-80 scrollbar-thin space-y-2.5 overflow-y-auto pe-1">
                  {catalog.map((role) => {
                    const checked = pickedIds.includes(role.id)
                    return (
                      <li key={role.id}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors select-none',
                            checked
                              ? 'border-primary bg-brand-50/40 dark:bg-brand-500/10'
                              : 'hover:border-ink-300 dark:hover:border-white/20'
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) =>
                              toggle(role.id, value === true)
                            }
                          />
                          <span className="text-label font-semibold text-foreground">
                            {roleTitle(role, locale)}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
              {!roles.isPending && !roles.isError && benefits.length === 0 ? (
                <p className="text-caption text-muted-foreground">
                  {t('pickOne')}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-5 lg:col-span-7">
              <div>
                <h3 className="text-title-sm font-semibold text-foreground">
                  {t('priceTitle')}
                </h3>
                <p className="mt-1.5 text-label leading-relaxed text-muted-foreground">
                  {t('priceBody')}
                </p>
              </div>
              <div className="space-y-3">
                <Tip
                  icon={<Layers />}
                  title={t('howManyTitle')}
                  body={t('howManyBody')}
                />
                <Tip
                  icon={<Coins />}
                  title={t('whatPriceTitle')}
                  body={t('whatPriceBody', {
                    low: formatMoney(TIER_PRICE_SHORTCUTS[0]),
                    high: formatMoney(TIER_PRICE_SHORTCUTS[2]),
                  })}
                />
              </div>
              <fieldset>
                <legend className="mb-2 text-label font-semibold text-foreground">
                  {t('startingPrice')}
                </legend>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {TIER_PRICE_SHORTCUTS.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      aria-pressed={price === amount}
                      onClick={() => setPrice(amount)}
                      className={cn(
                        'numeric h-auto py-3 text-label',
                        price === amount &&
                          'border-primary bg-brand-50/40 ring-1 ring-primary ring-inset dark:bg-brand-500/10'
                      )}
                    >
                      {formatMoney(amount)}
                    </Button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
          <div className="flex justify-center lg:col-span-5">
            <div className="w-full">
              <div className="mb-2 flex justify-center">
                <Badge variant="neutral">
                  {step === 1 ? t('previewBadge') : t('readyBadge')}
                </Badge>
              </div>
              {preview}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 sm:justify-between">
          {step === 2 ? (
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft aria-hidden className="rtl:rotate-180" />
              {t('previous')}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon('cancel')}
            </Button>
          )}
          {step === 1 ? (
            <Button type="button" variant="inverse" onClick={() => setStep(2)}>
              {t('next')}
              <ArrowRight aria-hidden className="rtl:rotate-180" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() =>
                onFinish({
                  title: t('defaultName'),
                  description: t('defaultDescription'),
                  price,
                  benefits,
                })
              }
            >
              <Check aria-hidden strokeWidth={2.5} />
              {t('finish')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Tip({
  icon,
  title,
  body,
}: {
  icon: ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-md bg-muted p-3.5">
      <span
        aria-hidden
        className="mt-0.5 shrink-0 text-foreground [&_svg]:size-4.5"
      >
        {icon}
      </span>
      <div>
        <h4 className="text-label font-semibold text-foreground">{title}</h4>
        <p className="mt-0.5 text-caption leading-5 text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  )
}
