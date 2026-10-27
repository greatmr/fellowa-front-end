'use client'

import { useRef, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  validPriceInput,
  type TierDraft,
} from '@/features/tiers/lib/tier-draft'
import { MAX_TIER_PRICE_TOMAN } from '@/features/tiers/schemas/tier'
import type { TierRole } from '@/features/tiers/types/tier'

export type TierEditor = { id?: number; draft: TierDraft }

type RolesState = {
  data: TierRole[] | undefined
  isPending: boolean
  isError: boolean
  refetch: () => unknown
}

type Props = {
  editor: TierEditor | null
  roles: RolesState
  pending: boolean
  saveFailed: boolean
  validationFailed: boolean
  onChange: (patch: Partial<TierDraft>) => void
  onSubmit: () => void
  onClose: () => void
}

export function TierFormSheet({
  editor,
  roles,
  pending,
  saveFailed,
  validationFailed,
  onChange,
  onSubmit,
  onClose,
}: Props) {
  const t = useTranslations('tiers')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const nextBenefitKey = useRef(0)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  function updateBenefit(
    index: number,
    patch: Partial<TierDraft['benefits'][number]>
  ) {
    if (!editor) return
    onChange({
      benefits: editor.draft.benefits.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    })
  }

  return (
    <Sheet
      open={editor !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <SheetContent closeLabel={tCommon('close')} className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {editor?.id ? t('editTitle') : t('createTitle')}
          </SheetTitle>
          <SheetDescription>{t('formHint')}</SheetDescription>
        </SheetHeader>
        {editor ? (
          <form
            id="tier-form"
            onSubmit={submit}
            className="space-y-5 px-5 pb-6"
            noValidate
          >
            <fieldset disabled={pending} className="min-w-0 space-y-5">
              <label className="block space-y-2 text-label font-semibold">
                <span>{t('name')}</span>
                <Input
                  value={editor.draft.title}
                  onChange={(event) => onChange({ title: event.target.value })}
                  maxLength={255}
                  required
                  aria-invalid={validationFailed && !editor.draft.title.trim()}
                />
              </label>
              <label className="block space-y-2 text-label font-semibold">
                <span>{t('description')}</span>
                <textarea
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={editor.draft.description}
                  onChange={(event) =>
                    onChange({ description: event.target.value })
                  }
                />
              </label>
              <label className="block space-y-2 text-label font-semibold">
                <span>{t('priceToman')}</span>
                <Input
                  value={editor.draft.price}
                  onChange={(event) => onChange({ price: event.target.value })}
                  type="number"
                  min="1"
                  max={String(MAX_TIER_PRICE_TOMAN)}
                  step="1"
                  inputMode="numeric"
                  dir="ltr"
                  required
                  aria-invalid={
                    validationFailed && !validPriceInput(editor.draft.price)
                  }
                />
                <span className="block text-xs font-normal text-muted-foreground">
                  {t('priceHint')}
                </span>
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-label font-semibold">{t('benefits')}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!roles.data?.length}
                    onClick={() =>
                      onChange({
                        benefits: [
                          ...editor.draft.benefits,
                          {
                            key: `new-${nextBenefitKey.current++}`,
                            title: '',
                            roleId: String(roles.data?.[0]?.id ?? ''),
                          },
                        ],
                      })
                    }
                  >
                    <Plus aria-hidden />
                    {t('addBenefit')}
                  </Button>
                </div>
                {roles.isPending ? (
                  <p
                    role="status"
                    className="text-body-sm text-muted-foreground"
                  >
                    {tCommon('loading')}
                  </p>
                ) : null}
                {roles.isError ? (
                  <p role="alert" className="text-body-sm text-destructive">
                    {t('rolesError')}{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => void roles.refetch()}
                    >
                      {tCommon('retry')}
                    </button>
                  </p>
                ) : null}
                {editor.draft.benefits.map((benefit, index) => (
                  <div
                    key={benefit.key}
                    className="space-y-2 rounded-md border p-3"
                  >
                    <label className="block space-y-1 text-label">
                      <span>{t('benefitName')}</span>
                      <Input
                        value={benefit.title}
                        onChange={(event) =>
                          updateBenefit(index, { title: event.target.value })
                        }
                        maxLength={255}
                        required
                      />
                    </label>
                    <label className="block space-y-1 text-label">
                      <span>{t('benefitRole')}</span>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-body-sm"
                        value={benefit.roleId}
                        onChange={(event) =>
                          updateBenefit(index, { roleId: event.target.value })
                        }
                        required
                      >
                        {roles.data?.map((role) => (
                          <option key={role.id} value={role.id}>
                            {locale === 'fa'
                              ? role.persianTitle || role.title
                              : role.title}
                          </option>
                        ))}
                        {!roles.data?.some(
                          (role) => String(role.id) === benefit.roleId
                        ) ? (
                          <option value={benefit.roleId}>
                            {t('unknownRole')}
                          </option>
                        ) : null}
                      </select>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onChange({
                          benefits: editor.draft.benefits.filter(
                            (_, i) => i !== index
                          ),
                        })
                      }
                    >
                      <Trash2 aria-hidden />
                      {t('removeBenefit')}
                    </Button>
                  </div>
                ))}
              </div>
            </fieldset>
            {validationFailed ? (
              <p role="alert" className="text-body-sm text-destructive">
                {t('validationError')}
              </p>
            ) : null}
            {saveFailed ? (
              <p role="alert" className="text-body-sm text-destructive">
                {t('saveError')}
              </p>
            ) : null}
            <SheetFooter className="px-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={pending}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? t('saving') : tCommon('save')}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
