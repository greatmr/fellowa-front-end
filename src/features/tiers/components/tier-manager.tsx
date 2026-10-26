'use client'

import { useRef, useState, type FormEvent } from 'react'
import { Layers3, Plus, Trash2 } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { StudioPageHeader } from '@/components/layout/studio-page-header'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  useCreateTierMutation,
  useDeleteTierMutation,
  useTierRolesQuery,
  useTiersQuery,
  useUpdateTierMutation,
} from '@/features/tiers/api/tier-hooks'
import type {
  CreateTierPayload,
  Tier,
  TierBenefitPayload,
} from '@/features/tiers/types/tier'

type TierDraft = {
  title: string
  description: string
  price: string
  benefits: { key: string; title: string; roleId: string }[]
}

const emptyDraft: TierDraft = {
  title: '',
  description: '',
  price: '',
  benefits: [],
}

function draftFromTier(tier: Tier): TierDraft {
  return {
    title: tier.title,
    description: tier.description,
    price: String(tier.priceToman),
    benefits: tier.benefits.map(({ id, title, roleId }) => ({
      key: `existing-${id}`,
      title,
      roleId: String(roleId),
    })),
  }
}

/** Reject fractional, unsafe, or out-of-range money before it reaches the API. */
function validPriceInput(value: string): boolean {
  if (!/^\d{1,10}$/.test(value)) return false
  const price = Number(value)
  return price > 0 && price <= 9_999_999_999
}

function payloadFromDraft(draft: TierDraft): CreateTierPayload | null {
  if (!validPriceInput(draft.price)) return null
  const price = Number(draft.price)
  const title = draft.title.trim()
  if (!title || title.length > 255) return null
  const benefits: TierBenefitPayload[] = []
  for (const item of draft.benefits) {
    const benefitTitle = item.title.trim()
    const roleId = Number(item.roleId)
    if (
      !benefitTitle ||
      benefitTitle.length > 255 ||
      !Number.isSafeInteger(roleId) ||
      roleId <= 0
    )
      return null
    benefits.push({ title: benefitTitle, roleId })
  }
  return {
    title,
    description: draft.description.trim(),
    price,
    benefits,
  }
}

export function TierManager({ viewerId }: { viewerId: number }) {
  const t = useTranslations('tiers')
  const tCommon = useTranslations('common')
  const tStudio = useTranslations('studio')
  const format = useFormatter()
  const locale = useLocale()
  const tiers = useTiersQuery(viewerId)
  const roles = useTierRolesQuery(viewerId)
  const create = useCreateTierMutation(viewerId)
  const update = useUpdateTierMutation(viewerId)
  const remove = useDeleteTierMutation(viewerId)
  const [editor, setEditor] = useState<{
    id?: number
    draft: TierDraft
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tier | null>(null)
  const [formError, setFormError] = useState(false)
  const nextBenefitKey = useRef(0)
  const pending = create.isPending || update.isPending

  function openEditor(tier?: Tier) {
    create.reset()
    update.reset()
    setFormError(false)
    setEditor({
      id: tier?.id,
      draft: tier ? draftFromTier(tier) : { ...emptyDraft, benefits: [] },
    })
  }

  function setDraft(patch: Partial<TierDraft>) {
    setEditor((current) =>
      current ? { ...current, draft: { ...current.draft, ...patch } } : current
    )
    setFormError(false)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editor || pending) return
    const payload = payloadFromDraft(editor.draft)
    if (!payload) {
      setFormError(true)
      return
    }
    if (editor.id) {
      update.mutate(
        { id: editor.id, ...payload },
        {
          onSuccess: () => setEditor(null),
        }
      )
    } else {
      create.mutate(payload, { onSuccess: () => setEditor(null) })
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <StudioPageHeader
          title={tStudio('pages.tiers.title')}
          category={tStudio('pages.tiers.category')}
        />
        <Button type="button" onClick={() => openEditor()}>
          <Plus aria-hidden />
          {t('create')}
        </Button>
      </div>

      {tiers.isPending ? (
        <p role="status" className="py-12 text-center text-muted-foreground">
          {tCommon('loading')}
        </p>
      ) : tiers.isError ? (
        <ErrorState
          title={t('loadError')}
          action={
            <Button type="button" onClick={() => void tiers.refetch()}>
              {tCommon('retry')}
            </Button>
          }
        />
      ) : tiers.data.length === 0 ? (
        <EmptyState
          icon={<Layers3 />}
          title={t('emptyTitle')}
          description={t('emptyBody')}
          action={
            <Button type="button" onClick={() => openEditor()}>
              {t('create')}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tiers.data.map((tier) => (
            <article
              key={tier.id}
              className="flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-5 shadow-sm"
            >
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
                  onClick={() => openEditor(tier)}
                >
                  {t('edit')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    remove.reset()
                    setDeleteTarget(tier)
                  }}
                >
                  {t('delete')}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Sheet
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setEditor(null)
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
                    onChange={(event) =>
                      setDraft({ title: event.target.value })
                    }
                    maxLength={255}
                    required
                    aria-invalid={formError && !editor.draft.title.trim()}
                  />
                </label>
                <label className="block space-y-2 text-label font-semibold">
                  <span>{t('description')}</span>
                  <textarea
                    className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={editor.draft.description}
                    onChange={(event) =>
                      setDraft({ description: event.target.value })
                    }
                  />
                </label>
                <label className="block space-y-2 text-label font-semibold">
                  <span>{t('priceToman')}</span>
                  <Input
                    value={editor.draft.price}
                    onChange={(event) =>
                      setDraft({ price: event.target.value })
                    }
                    type="number"
                    min="1"
                    max="9999999999"
                    step="1"
                    inputMode="numeric"
                    dir="ltr"
                    required
                    aria-invalid={
                      formError && !validPriceInput(editor.draft.price)
                    }
                  />
                  <span className="block text-xs font-normal text-muted-foreground">
                    {t('priceHint')}
                  </span>
                </label>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-label font-semibold">
                      {t('benefits')}
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!roles.data?.length}
                      onClick={() =>
                        setDraft({
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
                            setDraft({
                              benefits: editor.draft.benefits.map((item, i) =>
                                i === index
                                  ? { ...item, title: event.target.value }
                                  : item
                              ),
                            })
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
                            setDraft({
                              benefits: editor.draft.benefits.map((item, i) =>
                                i === index
                                  ? { ...item, roleId: event.target.value }
                                  : item
                              ),
                            })
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
                          setDraft({
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
              {formError ? (
                <p role="alert" className="text-body-sm text-destructive">
                  {t('validationError')}
                </p>
              ) : null}
              {create.isError || update.isError ? (
                <p role="alert" className="text-body-sm text-destructive">
                  {t('saveError')}
                </p>
              ) : null}
              <SheetFooter className="px-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditor(null)}
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

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setDeleteTarget(null)
        }}
      >
        <DialogContent closeLabel={tCommon('close')}>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteBody', { title: deleteTarget?.title ?? '' })}
            </DialogDescription>
          </DialogHeader>
          {remove.isError ? (
            <p role="alert" className="text-body-sm text-destructive">
              {t('deleteError')}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={remove.isPending}
              onClick={() => setDeleteTarget(null)}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => {
                if (deleteTarget)
                  remove.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  })
              }}
            >
              {remove.isPending ? t('deleting') : t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
