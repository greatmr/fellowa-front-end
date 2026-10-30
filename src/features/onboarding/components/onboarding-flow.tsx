'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { NameStep } from '@/features/onboarding/components/name-step'
import { SocialsStep } from '@/features/onboarding/components/socials-step'
import { UsernameStep } from '@/features/onboarding/components/username-step'
import type { OnboardingData } from '@/features/onboarding/types/onboarding'
import { Link, useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const STEPS = ['name', 'username', 'socials'] as const
type Step = (typeof STEPS)[number]

/**
 * Creator onboarding (FE-ONB-01; CP-02, CP-03; presentation
 * `Onboarding{Name,Url,Socials}Screen` @ 01fb04d). Never a gate (CP-01): it is
 * reached from the studio checklist and can be left from any step, and each
 * step saves on its own, so leaving keeps what was saved.
 *
 * Not ported: the interests and topics steps (FQ-4), the live preview card
 * (its address would be false under C-9; its name has no backend field), and
 * Telegram and Aparat, which `UpdateAboutDto` has no field for.
 */
export function OnboardingFlow({
  viewerId,
  firstName,
  lastName,
  alias,
  links,
}: OnboardingData) {
  const t = useTranslations('onboarding')
  const router = useRouter()
  // The checklist sends someone here for the username; a saved name is not
  // asked for first. These hold what was saved so far, for the Back button.
  const [step, setStep] = useState<Step>(firstName ? 'username' : 'name')
  const [names, setNames] = useState({ firstName, lastName })
  const [storedAlias, setStoredAlias] = useState(alias)
  const [justSavedAlias, setJustSavedAlias] = useState<string | null>(null)
  const [draftLinks, setDraftLinks] = useState(links)

  const current = STEPS.indexOf(step) + 1

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-label font-semibold text-muted-foreground">
            {t('progress', { current, total: STEPS.length })}
          </p>
          <Link
            href="/studio"
            className="text-label font-semibold text-link underline-offset-4 hover:underline"
          >
            {t('exit')}
          </Link>
        </div>
        <div
          role="progressbar"
          aria-label={t('progressLabel')}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={current}
          className="flex w-full gap-1.5"
        >
          {STEPS.map((name, index) => (
            <div
              key={name}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                index < current ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>

      {step === 'name' ? (
        <NameStep
          viewerId={viewerId}
          initial={names}
          onSaved={(saved) => {
            setNames(saved)
            setStep('username')
          }}
        />
      ) : step === 'username' ? (
        <UsernameStep
          initial={storedAlias}
          onBack={() => setStep('name')}
          onSaved={(saved) => {
            setJustSavedAlias(saved === storedAlias ? null : saved)
            setStoredAlias(saved)
            setStep('socials')
          }}
        />
      ) : (
        <SocialsStep
          viewerId={viewerId}
          initial={draftLinks}
          saved={links}
          savedAlias={justSavedAlias}
          onChanged={setDraftLinks}
          onBack={() => setStep('username')}
          onFinished={() => router.replace('/studio')}
        />
      )}
    </div>
  )
}
