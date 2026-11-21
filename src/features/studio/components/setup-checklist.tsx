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
import { deriveSetupSteps } from '@/features/studio/lib/setup-steps'
import type { SetupFacts, SetupStepId } from '@/features/studio/types/dashboard'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

type Href = ComponentProps<typeof Link>['href']

/**
 * Steps whose screen exists link to it. "Publish" is state only: the banner
 * above carries the one publish action and the reason it is held back. "Profile photo and cover" goes to
 * settings until a page editor exists (FQ-27 answer, 2026-11-21). "Payout" has
 * no editing screen yet (FE-PAYOUT-01 is blocked), so it shows state only —
 * never a row that leads nowhere.
 */
const STEP_HREFS: Partial<Record<SetupStepId, Href>> = {
  profile: '/settings',
  firstTier: '/studio/tiers',
  firstPost: '/studio/posts/new',
}

/**
 * The five-step setup checklist (CP-04; presentation `StudioChecklistCard` @
 * d843c3b, collapse from `DashboardView`). Every step is derived from backend
 * rows on each visit; the card leaves once all five are done, as designed.
 * Not ported: "later" (a session-only dismiss with no basis), the
 * `fellowa.ir/slug` copy row (no such public address; the page is
 * `/creators/:id`), confetti (FQ-10), and a second publish button: the
 * banner above carries the one publish action.
 */
export function SetupChecklist({ facts }: { facts: SetupFacts }) {
  const t = useTranslations('studio.dashboard')
  const format = useFormatter()
  const [collapsed, setCollapsed] = useState(false)
  const listId = useId()
  const steps = deriveSetupSteps(facts)
  const doneCount = steps.filter((step) => step.done).length

  if (doneCount === steps.length) return null

  return (
    <Card
      className="gap-5 px-5 py-5 sm:px-6"
      aria-labelledby="setup-checklist-title"
    >
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

          return (
            <li key={step.id}>
              {href ? (
                <Link
                  href={href}
                  className="group flex items-center justify-between gap-3 rounded-md px-2 py-3 outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {label}
                  <ChevronRightIcon
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
                  />
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
