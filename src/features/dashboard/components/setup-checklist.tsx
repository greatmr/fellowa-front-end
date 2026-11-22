'use client'

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MinusIcon,
} from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { useId, useState, type ComponentProps } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { usePublishPage } from '@/features/dashboard/components/publish-page-provider'
import {
  dismissChecklistForSession,
  useChecklistDismissed,
} from '@/features/dashboard/lib/checklist-dismissal'
import {
  deriveSetupSteps,
  publishBlockedBy,
  publishBlockedMessageKey,
} from '@/features/dashboard/lib/setup-steps'
import type {
  SetupFacts,
  SetupStepId,
} from '@/features/dashboard/types/dashboard'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

type Href = ComponentProps<typeof Link>['href']

/**
 * Steps whose screen exists link to it. "Publish" runs the shared publish
 * action (the banner's, one request). "Profile photo and cover" goes to
 * settings until a page editor exists (FQ-27 answer, 2026-11-21). "Payout" has
 * no editing screen yet (FE-PAYOUT-01 is blocked), so it shows state only —
 * never a row that leads nowhere.
 */
const STEP_HREFS: Partial<Record<SetupStepId, Href>> = {
  profile: '/settings',
  firstTier: '/tiers',
  firstPost: '/posts/new',
}

/**
 * The five-step setup checklist (CP-04; FQ-28 option B: the steps, title and
 * session-only «بعداً» of presentation `StudioChecklistCard` @ d843c3b, in
 * `DashboardView`'s card with its collapse). Every step is derived from
 * backend rows on each visit; the card leaves once all five are done, as
 * designed. The publish row calls the banner's publish action, so both share
 * one request and one pending state. Must sit inside `PublishPageProvider`.
 * Not ported: confetti (FQ-10); the address row is `PublicAddressRow`.
 */
export function SetupChecklist({ facts }: { facts: SetupFacts }) {
  const t = useTranslations('panel.dashboard')
  const format = useFormatter()
  const { publish, pending } = usePublishPage()
  const dismissed = useChecklistDismissed()
  const [collapsed, setCollapsed] = useState(false)
  const listId = useId()
  const publishReasonId = useId()
  const steps = deriveSetupSteps(facts)
  const doneCount = steps.filter((step) => step.done).length
  const blockedKey = publishBlockedMessageKey(publishBlockedBy(facts))

  if (dismissed || doneCount === steps.length) return null

  return (
    <Card className="gap-5 p-6" aria-labelledby="setup-checklist-title">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="setup-checklist-title"
              className="text-subtitle font-bold text-foreground"
            >
              {t('title')}
            </h2>
            {facts.isPublished ? null : (
              <Badge variant="amber">{t('draft')}</Badge>
            )}
          </div>
          <p className="text-body-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={dismissChecklistForSession}
          >
            {t('later')}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-expanded={!collapsed}
            aria-controls={listId}
            aria-label={collapsed ? t('expand') : t('collapse')}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? (
              <ChevronDownIcon aria-hidden />
            ) : (
              <MinusIcon aria-hidden />
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between text-label font-semibold text-muted-foreground">
          <span>{t('progress', { done: doneCount, total: steps.length })}</span>
          <span>
            {format.number(doneCount / steps.length, { style: 'percent' })}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={t('title')}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={doneCount}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-smooth"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <ol id={listId} hidden={collapsed} className="grid divide-y border-t">
        {steps.map((step) => {
          const href = STEP_HREFS[step.id]
          const label = (
            <span className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border',
                  step.done
                    ? 'border-success bg-success text-success-foreground'
                    : 'bg-background'
                )}
              >
                {step.done ? <CheckIcon className="size-3.5" /> : null}
              </span>
              <span
                className={cn(
                  'text-body font-semibold',
                  step.done
                    ? 'text-muted-foreground line-through'
                    : 'text-foreground'
                )}
              >
                {t(`steps.${step.id}.label`)}
                <span className="sr-only">
                  {' '}
                  — {step.done ? t('stepDone') : t('stepTodo')}
                </span>
              </span>
            </span>
          )

          const rowClass =
            'group flex w-full items-center justify-between gap-3 rounded-md px-2 py-3 text-start outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50'
          const chevron = (
            <ChevronRightIcon
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
            />
          )

          if (step.id === 'publish' && !step.done) {
            return (
              <li key={step.id}>
                <button
                  type="button"
                  className={cn(
                    rowClass,
                    'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent'
                  )}
                  disabled={pending || blockedKey !== null}
                  aria-describedby={blockedKey ? publishReasonId : undefined}
                  onClick={publish}
                >
                  {label}
                  {chevron}
                </button>
                {blockedKey ? (
                  <p
                    id={publishReasonId}
                    className="ps-11 pb-3 text-label text-muted-foreground"
                  >
                    {t(blockedKey)}
                  </p>
                ) : null}
              </li>
            )
          }

          return (
            <li key={step.id}>
              {href ? (
                <Link href={href} className={rowClass}>
                  {label}
                  {chevron}
                </Link>
              ) : (
                <div className="px-2 py-3">{label}</div>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
