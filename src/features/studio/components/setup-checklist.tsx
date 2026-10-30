import {
  CheckIcon,
  FileTextIcon,
  LandmarkIcon,
  LayersIcon,
  RocketIcon,
  SettingsIcon,
  type LucideIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PublishButton } from '@/features/studio/components/publish-button'
import {
  deriveSetupSteps,
  publishBlockedBy,
} from '@/features/studio/schemas/dashboard'
import type { SetupFacts, SetupStepId } from '@/features/studio/types/dashboard'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const STEP_ICONS: Record<SetupStepId, LucideIcon> = {
  basics: SettingsIcon,
  firstTier: LayersIcon,
  firstPost: FileTextIcon,
  payout: LandmarkIcon,
  publish: RocketIcon,
}

/**
 * Steps whose screen exists link to it. "Basics" and "payout" have no editing
 * screen yet (FE-ONB-01 and FE-PAYOUT-01 are blocked), so they show state
 * only — never a button that leads nowhere.
 */
const STEP_HREFS: Partial<Record<SetupStepId, string>> = {
  firstTier: '/studio/tiers',
  firstPost: '/studio/posts/new',
}

/**
 * The five-step setup checklist (CP-04; presentation `DashboardView`
 * checklist @ ea2d41a). Every step is derived from backend rows on each
 * visit. Not ported: the prototype's financial-goal and "promote" steps, which
 * have no story (FQ-2) and no backend.
 */
export function SetupChecklist({
  viewerId,
  facts,
}: {
  viewerId: number
  facts: SetupFacts
}) {
  const t = useTranslations('studio.dashboard')
  const steps = deriveSetupSteps(facts)
  const doneCount = steps.filter((step) => step.done).length
  const blockedBy = publishBlockedBy(facts)

  return (
    <Card
      className="gap-5 px-5 py-5 sm:px-6"
      aria-labelledby="setup-checklist-title"
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="setup-checklist-title"
            className="text-subtitle font-bold text-foreground"
          >
            {t('title')}
          </h2>
          <p className="text-label font-semibold text-muted-foreground">
            {t('progress', { done: doneCount, total: steps.length })}
          </p>
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
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-smooth"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="grid gap-3">
        {steps.map((step) => {
          const Icon = STEP_ICONS[step.id]
          const href = STEP_HREFS[step.id]
          return (
            <li
              key={step.id}
              className="flex flex-wrap items-start gap-3 rounded-md border bg-background p-4"
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full',
                  step.done
                    ? 'bg-success text-success-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {step.done ? (
                  <CheckIcon className="size-4" aria-hidden />
                ) : (
                  <Icon className="size-4" aria-hidden />
                )}
              </span>
              <div className="grid min-w-0 flex-1 gap-1">
                <p className="text-body font-semibold text-foreground">
                  {t(`steps.${step.id}.label`)}
                  <span className="sr-only">
                    {' '}
                    — {step.done ? t('stepDone') : t('stepTodo')}
                  </span>
                </p>
                <p className="text-label text-muted-foreground">
                  {t(`steps.${step.id}.description`)}
                </p>
              </div>
              {step.done ? null : step.id === 'publish' ? (
                <PublishButton
                  viewerId={viewerId}
                  blockedReason={
                    blockedBy === 'basics'
                      ? t('publishNeedsUsername')
                      : blockedBy === 'firstTier'
                        ? t('publishNeedsTier')
                        : null
                  }
                />
              ) : href ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={href}>{t(`steps.${step.id}.action`)}</Link>
                </Button>
              ) : null}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
