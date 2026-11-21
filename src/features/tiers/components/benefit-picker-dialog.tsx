'use client'

import { useId, useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CharCount } from '@/features/tiers/components/char-count'
import { roleTitle } from '@/features/tiers/lib/role-title'
import { MAX_BENEFIT_TITLE } from '@/features/tiers/schemas/tier'
import type { TierRole } from '@/features/tiers/types/tier'

export type BenefitPickerRequest =
  { kind: 'add' } | { kind: 'edit'; index: number; title: string }

type RolesState = {
  data: TierRole[] | undefined
  isPending: boolean
  isError: boolean
  refetch: () => unknown
}

type Props = {
  request: BenefitPickerRequest | null
  roles: RolesState
  /** `roleId` `null` is a custom benefit (BE-TIER-06). */
  onAdd: (title: string, roleId: number | null) => void
  onSave: (index: number, title: string) => void
  onClose: () => void
}

/** `source`: a preset, a custom benefit, or the row being edited. */
type Source = TierRole | 'custom' | 'existing'
type Step =
  { name: 'catalog' } | { name: 'title'; source: Source; title: string }

function initialStep(request: BenefitPickerRequest | null): Step {
  return request?.kind === 'edit'
    ? { name: 'title', source: 'existing', title: request.title }
    : { name: 'catalog' }
}

/**
 * The prototype's two-step benefit flow (`TiersView` @ d843c3b): pick a preset
 * from `GET /tire/role` or a custom one (no `roleId`, BE-TIER-06), then
 * adjust its title. The presets carry no description.
 * Mount with a `key` per request so each opening starts fresh.
 */
export function BenefitPickerDialog({
  request,
  roles,
  onAdd,
  onSave,
  onClose,
}: Props) {
  const t = useTranslations('tiers.picker')
  const tTiers = useTranslations('tiers')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const countId = useId()
  const [step, setStep] = useState<Step>(() => initialStep(request))
  const catalog = roles.data ?? []

  function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step.name !== 'title') return
    const title = step.title.trim()
    if (!title) return
    if (request?.kind === 'edit') onSave(request.index, title)
    else if (step.source === 'custom') onAdd(title, null)
    else if (step.source !== 'existing') onAdd(title, step.source.id)
  }

  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent closeLabel={tCommon('close')} className="sm:max-w-lg">
        {step.name === 'catalog' ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('catalogTitle')}</DialogTitle>
            </DialogHeader>
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
              <ul className="-mx-6 max-h-[60vh] scrollbar-thin divide-y overflow-y-auto px-6">
                {catalog.map((role) => {
                  const name = roleTitle(role, locale)
                  return (
                    <li
                      key={role.id}
                      className="flex items-center justify-between gap-4 py-3.5"
                    >
                      <span className="min-w-0 text-label font-semibold text-foreground">
                        {name}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={t('addTitle', { title: name })}
                        onClick={() =>
                          setStep({ name: 'title', source: role, title: name })
                        }
                      >
                        {t('add')}
                      </Button>
                    </li>
                  )
                })}
                {catalog.length === 0 ? (
                  <li className="py-3.5 text-body-sm text-muted-foreground">
                    {t('empty')}
                  </li>
                ) : null}
                <li className="flex items-center justify-between gap-4 py-3.5">
                  <span className="min-w-0">
                    <span className="block text-label font-semibold text-foreground">
                      {t('customTitle')}
                    </span>
                    <span className="mt-1 block text-caption leading-5 text-muted-foreground">
                      {t('customHint')}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={t('customTitle')}
                    onClick={() =>
                      setStep({ name: 'title', source: 'custom', title: '' })
                    }
                  >
                    {t('add')}
                  </Button>
                </li>
              </ul>
            )}
          </>
        ) : (
          <form onSubmit={confirm} className="grid gap-6" noValidate>
            <DialogHeader>
              <DialogTitle>
                {step.source === 'existing'
                  ? t('editTitle')
                  : step.source === 'custom'
                    ? t('customTitle')
                    : t('addTitle', { title: roleTitle(step.source, locale) })}
              </DialogTitle>
              <DialogDescription className="leading-6">
                {step.source === 'existing'
                  ? t('editHint')
                  : step.source === 'custom'
                    ? t('customDetail')
                    : t('addHint')}
              </DialogDescription>
            </DialogHeader>
            <div>
              <label className="grid gap-2 text-label font-semibold text-foreground">
                <span>{t('titleLabel')}</span>
                <Input
                  autoFocus
                  required
                  maxLength={MAX_BENEFIT_TITLE}
                  placeholder={t('titlePlaceholder')}
                  value={step.title}
                  aria-describedby={countId}
                  onChange={(event) =>
                    setStep({ ...step, title: event.target.value })
                  }
                />
              </label>
              <CharCount
                id={countId}
                count={step.title.length}
                max={MAX_BENEFIT_TITLE}
              />
            </div>
            <DialogFooter>
              {step.source === 'existing' ? null : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep({ name: 'catalog' })}
                >
                  {t('back')}
                </Button>
              )}
              <Button
                type="submit"
                variant="inverse"
                disabled={!step.title.trim()}
              >
                {step.source === 'existing'
                  ? t('confirmSave')
                  : t('confirmAdd')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
