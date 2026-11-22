'use client'

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import Image from 'next/image'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Edit3,
  ImageIcon,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { useFormatMoney } from '@/components/common/money'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateTierMutation,
  useUpdateTierMutation,
  useUploadTierCoverMutation,
} from '@/features/tiers/api/tier-hooks'
import { AliasRequiredNotice } from '@/features/tiers/components/alias-required-notice'
import {
  BenefitPickerDialog,
  type BenefitPickerRequest,
} from '@/features/tiers/components/benefit-picker-dialog'
import { CharCount } from '@/features/tiers/components/char-count'
import { TierPreviewCard } from '@/features/tiers/components/tier-preview-card'
import { MAX_TIER_COVER_BYTES } from '@/features/tiers/lib/cover-limits'
import {
  addBenefit,
  coverChange,
  coverForCreate,
  draftCapacity,
  draftErrors,
  draftPrice,
  moveBenefit,
  payloadFromDraft,
  priceChange,
  type TierDraft,
  type TierDraftError,
} from '@/features/tiers/lib/tier-draft'
import {
  MAX_BENEFIT_TITLE,
  MAX_TIER_TITLE,
  MIN_TIER_PRICE_TOMAN,
  TIER_COVER_TYPES,
  TIER_PRICE_SHORTCUTS,
} from '@/features/tiers/schemas/tier'
import type { Tier, TierRole } from '@/features/tiers/types/tier'
import type { ApiError } from '@/lib/api/errors'
import { uploadProblem, type UploadProblem } from '@/lib/api/upload-problem'
import { cn } from '@/lib/utils'

type RolesState = {
  data: TierRole[] | undefined
  isPending: boolean
  isError: boolean
  refetch: () => unknown
}

type Props = {
  viewerId: number
  /** The saved tier being edited; `null` creates one. */
  saved: Tier | null
  initialDraft: TierDraft
  roles: RolesState
  onClose: () => void
  onDelete: (tier: Tier) => void
}

/** The cover's line; `noPage` and `sessionExpired` are not lines (below). */
type CoverProblem = Exclude<UploadProblem, 'noPage' | 'sessionExpired'> | null

const NO_PAGE = 'USER_ALIAS_REQUIRED'
const PRICE_BELOW_MINIMUM = 'TIER_PRICE_BELOW_MINIMUM'

const COVER_PROBLEM_KEY = {
  type: 'coverTypeError',
  unavailable: 'coverUnavailable',
  storage: 'coverStorageError',
  requestRefused: 'coverRequestRefused',
  accountRefused: 'coverAccountRefused',
  failed: 'coverError',
} as const

/**
 * The full-page tier builder (presentation `TiersView` @ d843c3b): the form,
 * and beside it a sticky card preview drawn from the unsaved draft (TB-03).
 * Monthly price only (FQ-11); welcome note, Telegram/Discord, the highlighted
 * badge and the earnings estimate are not ported (FQ-12).
 */
export function TierBuilder({
  viewerId,
  saved,
  initialDraft,
  roles,
  onClose,
  onDelete,
}: Props) {
  const t = useTranslations('tiers.builder')
  const tPreview = useTranslations('tiers.preview')
  const tCommon = useTranslations('common')
  const format = useFormatter()
  const formatMoney = useFormatMoney()
  const ids = useId()
  const coverInput = useRef<HTMLInputElement | null>(null)
  const benefitKey = useRef(0)

  const [draft, setDraftState] = useState<TierDraft>(initialDraft)
  const [showErrors, setShowErrors] = useState(false)
  const [picker, setPicker] = useState<BenefitPickerRequest | null>(null)
  // Remounts the picker so each opening starts at its first step.
  const [pickerKey, setPickerKey] = useState(0)
  const [coverProblem, setCoverProblem] = useState<CoverProblem>(null)
  const [noPage, setNoPage] = useState(false)
  // 400 TIER_PRICE_BELOW_MINIMUM, shown on the price until it is edited.
  const [serverPriceMinimum, setServerPriceMinimum] = useState(false)

  const create = useCreateTierMutation(viewerId)
  const update = useUpdateTierMutation(viewerId)
  const upload = useUploadTierCoverMutation(viewerId)
  const save = saved ? update : create
  const pending = save.isPending

  const errors = draftErrors(draft, saved?.priceToman)
  const visibleErrors = showErrors ? errors : []
  const has = (error: TierDraftError) =>
    visibleErrors.includes(error) ||
    (error === 'priceMinimum' && serverPriceMinimum)
  const price = draftPrice(draft.price)
  const belowMinimum =
    price !== null &&
    price < MIN_TIER_PRICE_TOMAN &&
    price !== saved?.priceToman
  const coverUrl = draft.coverUrl
  // Display only: the limit in megabytes (1 MB = 1024 × 1024 bytes).
  const maxCoverSize = format.number(MAX_TIER_COVER_BYTES / (1024 * 1024), {
    style: 'unit',
    unit: 'megabyte',
    maximumFractionDigits: 0,
  })

  function setDraft(patch: Partial<TierDraft>) {
    setDraftState((current) => ({ ...current, ...patch }))
  }

  function changePrice(value: string) {
    setServerPriceMinimum(false)
    setDraft({ price: value })
  }

  function failed(error: ApiError) {
    if (error.code === NO_PAGE) setNoPage(true)
    else if (error.code === PRICE_BELOW_MINIMUM) setServerPriceMinimum(true)
    else if (error.status === 401) toast.error(t('sessionExpired'))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || upload.isPending) return
    const payload = payloadFromDraft(draft, saved?.priceToman)
    if (!payload) {
      setShowErrors(true)
      return
    }
    setNoPage(false)
    const done = () => {
      toast.success(
        saved
          ? t('savedToast', { title: payload.title })
          : t('createdToast', { title: payload.title })
      )
      onClose()
    }
    if (saved) {
      const { price: nextPrice, ...rest } = payload
      update.mutate(
        {
          id: saved.id,
          ...rest,
          ...priceChange(nextPrice, saved),
          ...coverChange(draft, saved),
        },
        { onSuccess: done, onError: failed }
      )
    } else {
      create.mutate(
        { ...payload, ...coverForCreate(draft) },
        { onSuccess: done, onError: failed }
      )
    }
  }

  function chooseCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!TIER_COVER_TYPES.some((type) => type === file.type)) {
      setCoverProblem('type')
      return
    }
    if (file.size > MAX_TIER_COVER_BYTES) {
      setCoverProblem('size')
      return
    }
    setCoverProblem(null)
    upload.mutate(file, {
      onSuccess: (cover) =>
        setDraft({ coverId: cover.id, coverUrl: cover.url }),
      onError: (error) => {
        // FE-TIER-04: a 401 is a toast, not a line, and the alias case has
        // its own notice; the rest is the shared upload table.
        const problem = uploadProblem(error)
        if (problem === 'noPage') setNoPage(true)
        else if (problem === 'sessionExpired') toast.error(t('sessionExpired'))
        else setCoverProblem(problem)
      },
    })
  }

  const saveLabel = pending
    ? t('saving')
    : saved
      ? t('saveChanges')
      : t('publish')
  const formId = `${ids}-form`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={pending}
          >
            <ArrowLeft aria-hidden className="rtl:rotate-180" />
            {t('back')}
          </Button>
          <span aria-hidden className="h-4 w-px bg-border" />
          <h1 dir="auto" className="min-w-0 truncate text-title-sm font-bold">
            {saved ? t('editTitle', { title: saved.title }) : t('createTitle')}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={pending}
          >
            {tCommon('cancel')}
          </Button>
          <Button type="submit" form={formId} disabled={pending}>
            <Check aria-hidden strokeWidth={2.5} />
            {saveLabel}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <form
          id={formId}
          onSubmit={submit}
          noValidate
          aria-busy={pending}
          className="space-y-6 lg:col-span-7"
        >
          <fieldset disabled={pending} className="min-w-0 space-y-6">
            <Card className="gap-0 p-6 sm:p-7">
              <SectionHeading
                title={t('detailsTitle')}
                hint={t('detailsHint')}
              />
              <div className="mt-6 space-y-6 border-t pt-4">
                <Field
                  id={`${ids}-name`}
                  label={t('name')}
                  required={t('required')}
                  aside={t('nameHint')}
                  error={
                    has('title')
                      ? t('errors.title', { max: MAX_TIER_TITLE })
                      : null
                  }
                >
                  <Input
                    id={`${ids}-name`}
                    value={draft.title}
                    maxLength={MAX_TIER_TITLE}
                    placeholder={t('namePlaceholder')}
                    aria-invalid={has('title')}
                    aria-describedby={`${ids}-name-count`}
                    onChange={(event) =>
                      setDraft({ title: event.target.value })
                    }
                  />
                  <CharCount
                    id={`${ids}-name-count`}
                    count={draft.title.length}
                    max={MAX_TIER_TITLE}
                  />
                </Field>

                <div className="border-t pt-6">
                  <Field
                    id={`${ids}-price`}
                    label={t('price')}
                    required={t('required')}
                    aside={t('priceMinimumHint', {
                      amount: formatMoney(MIN_TIER_PRICE_TOMAN),
                    })}
                    error={
                      has('price')
                        ? t('errors.price')
                        : belowMinimum || has('priceMinimum')
                          ? t('errors.priceMinimum', {
                              amount: formatMoney(MIN_TIER_PRICE_TOMAN),
                            })
                          : null
                    }
                    errorTone={
                      has('price') || has('priceMinimum') ? 'error' : 'warning'
                    }
                  >
                    <div className="relative">
                      <Input
                        id={`${ids}-price`}
                        value={draft.price}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder={format.number(MIN_TIER_PRICE_TOMAN)}
                        aria-invalid={has('price') || has('priceMinimum')}
                        className="numeric pe-28 font-semibold"
                        onChange={(event) => changePrice(event.target.value)}
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 end-3.5 flex items-center text-label font-medium text-muted-foreground"
                      >
                        {t('priceUnit')}
                      </span>
                    </div>
                  </Field>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="me-1 text-caption text-muted-foreground">
                      {t('priceShortcuts')}
                    </span>
                    {TIER_PRICE_SHORTCUTS.map((amount) => {
                      const selected = price === amount
                      return (
                        <button
                          key={amount}
                          type="button"
                          aria-pressed={selected}
                          aria-label={formatMoney(amount)}
                          onClick={() => changePrice(String(amount))}
                          className={cn(
                            'btn-tactile rounded-sm border px-2.5 py-1 text-caption font-semibold',
                            selected
                              ? 'border-inverse bg-inverse text-inverse-foreground'
                              : 'border-input bg-card text-foreground hover:bg-accent'
                          )}
                        >
                          {format.number(amount, { notation: 'compact' })}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <Field
                    id={`${ids}-description`}
                    label={t('description')}
                    optional={t('optional')}
                    hint={t('descriptionHint')}
                  >
                    <Textarea
                      id={`${ids}-description`}
                      rows={4}
                      value={draft.description}
                      placeholder={t('descriptionPlaceholder')}
                      className="min-h-24 resize-none text-label leading-6"
                      onChange={(event) =>
                        setDraft({ description: event.target.value })
                      }
                    />
                  </Field>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-label font-semibold text-foreground">
                    {t('cover')}{' '}
                    <span className="font-normal text-muted-foreground">
                      {t('optional')}
                    </span>
                  </h3>
                  <p className="mt-1.5 mb-3.5 text-label leading-5 text-muted-foreground">
                    {t('coverHint')}
                  </p>
                  <input
                    ref={coverInput}
                    type="file"
                    accept={TIER_COVER_TYPES.join(',')}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={chooseCover}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={upload.isPending}
                      onClick={() => coverInput.current?.click()}
                    >
                      <ImageIcon aria-hidden />
                      {upload.isPending
                        ? t('coverUploading')
                        : draft.coverId
                          ? t('coverChange')
                          : t('coverUpload')}
                    </Button>
                    {draft.coverId ? (
                      <div className="flex items-center gap-2.5">
                        {coverUrl ? (
                          <Image
                            src={coverUrl}
                            alt={t('coverPreviewAlt')}
                            width={64}
                            height={40}
                            unoptimized
                            className="h-10 w-16 rounded-md border object-cover"
                          />
                        ) : (
                          // A cover the server could not give a URL for.
                          <span
                            role="img"
                            aria-label={t('coverPreviewAlt')}
                            className="flex h-10 w-16 items-center justify-center rounded-md border bg-muted text-muted-foreground"
                          >
                            <ImageIcon aria-hidden className="size-4" />
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={upload.isPending}
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setDraft({ coverId: null, coverUrl: null })
                          }
                        >
                          {t('coverRemove')}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  {coverProblem ? (
                    <p
                      role="alert"
                      className="mt-2 text-caption text-destructive"
                    >
                      {coverProblem === 'size'
                        ? t('coverTooLarge', { size: maxCoverSize })
                        : t(COVER_PROBLEM_KEY[coverProblem])}
                    </p>
                  ) : null}
                  <p className="mt-2.5 text-caption text-muted-foreground">
                    {t('coverSizeHint', { size: maxCoverSize })}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="gap-0 p-6 sm:p-7">
              <SectionHeading
                title={t('benefits')}
                optional={t('optional')}
                hint={t('benefitsHint')}
              />
              {draft.benefits.length > 0 ? (
                <ul className="mt-4 divide-y border-y">
                  {draft.benefits.map((benefit, index) => (
                    <li
                      key={benefit.key}
                      className="flex items-center justify-between gap-3 py-3 text-label font-medium"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          aria-hidden
                          className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-secondary text-secondary-foreground"
                        >
                          <Check className="size-3" strokeWidth={2.8} />
                        </span>
                        <span dir="auto" className="truncate text-foreground">
                          {benefit.title}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === 0}
                          aria-label={t('moveBenefitUp', {
                            title: benefit.title,
                          })}
                          onClick={() =>
                            setDraft({
                              benefits: moveBenefit(draft.benefits, index, -1),
                            })
                          }
                        >
                          <ArrowUp aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === draft.benefits.length - 1}
                          aria-label={t('moveBenefitDown', {
                            title: benefit.title,
                          })}
                          onClick={() =>
                            setDraft({
                              benefits: moveBenefit(draft.benefits, index, 1),
                            })
                          }
                        >
                          <ArrowDown aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('editBenefit', {
                            title: benefit.title,
                          })}
                          onClick={() => {
                            setPickerKey((key) => key + 1)
                            setPicker({
                              kind: 'edit',
                              index,
                              title: benefit.title,
                            })
                          }}
                        >
                          <Edit3 aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="hover:text-destructive"
                          aria-label={t('removeBenefit', {
                            title: benefit.title,
                          })}
                          onClick={() =>
                            setDraft({
                              benefits: draft.benefits.filter(
                                (_, i) => i !== index
                              ),
                            })
                          }
                        >
                          <X aria-hidden />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {has('benefits') ? (
                <p role="alert" className="mt-2 text-caption text-destructive">
                  {t('errors.benefits', { max: MAX_BENEFIT_TITLE })}
                </p>
              ) : null}
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPickerKey((key) => key + 1)
                    setPicker({ kind: 'add' })
                  }}
                >
                  <Plus aria-hidden />
                  {t('addBenefit')}
                </Button>
              </div>
            </Card>

            <Card className="gap-0 p-6 sm:p-7">
              <h2 className="mb-2 text-subtitle font-semibold text-foreground">
                {t('advanced')}
              </h2>
              <div className="divide-y">
                <div className="py-4">
                  <SwitchRow
                    id={`${ids}-capacity`}
                    title={t('capacity')}
                    hint={t('capacityHint')}
                    checked={draft.capacityEnabled}
                    onCheckedChange={(capacityEnabled) =>
                      setDraft({ capacityEnabled })
                    }
                  />
                  {draft.capacityEnabled ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3 pt-2">
                      <label
                        htmlFor={`${ids}-capacity-number`}
                        className="text-label font-medium text-muted-foreground"
                      >
                        {t('capacityLabel')}
                      </label>
                      <Input
                        id={`${ids}-capacity-number`}
                        value={draft.capacity}
                        inputMode="numeric"
                        autoComplete="off"
                        aria-invalid={has('capacity')}
                        className="numeric h-9 w-24 text-center font-semibold"
                        onChange={(event) =>
                          setDraft({ capacity: event.target.value })
                        }
                      />
                      <span className="text-label text-muted-foreground">
                        {t('capacityUnit')}
                      </span>
                      {has('capacity') ? (
                        <p
                          role="alert"
                          className="basis-full text-caption text-destructive"
                        >
                          {t('errors.capacity')}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="pt-4">
                  <SwitchRow
                    id={`${ids}-chat`}
                    title={t('chat')}
                    hint={t('chatHint')}
                    checked={draft.chatEnabled}
                    onCheckedChange={(chatEnabled) => setDraft({ chatEnabled })}
                  />
                </div>
              </div>
            </Card>
          </fieldset>

          {noPage ? <AliasRequiredNotice /> : null}
          {save.isError &&
          !noPage &&
          save.error.status !== 401 &&
          save.error.code !== PRICE_BELOW_MINIMUM ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-label font-semibold text-destructive"
            >
              {t('saveError')}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {saved ? (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(saved)}
              >
                <Trash2 aria-hidden />
                {t('deleteTier')}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={pending}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={pending} className="px-6">
                <Check aria-hidden strokeWidth={2.5} />
                {saveLabel}
              </Button>
            </div>
          </div>
        </form>

        <aside
          aria-label={tPreview('title')}
          className="lg:sticky lg:top-20 lg:col-span-5"
        >
          <div className="rounded-md border bg-muted/70 p-5">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <span className="text-label font-semibold text-foreground">
                {tPreview('title')}
              </span>
              <span className="rounded-sm border bg-card px-2 py-0.5 text-caption font-medium text-muted-foreground">
                {tPreview('badge')}
              </span>
            </div>
            <TierPreviewCard
              title={draft.title}
              priceToman={price}
              description={draft.description}
              coverUrl={coverUrl}
              benefits={draft.benefits.map((benefit) => benefit.title)}
              capacity={
                draft.capacityEnabled ? draftCapacity(draft.capacity) : null
              }
              chatEnabled={draft.chatEnabled}
            />
            <p className="mt-3.5 text-center text-caption text-muted-foreground">
              {tPreview('footer')}
            </p>
          </div>
        </aside>
      </div>

      <BenefitPickerDialog
        key={pickerKey}
        request={picker}
        roles={roles}
        onAdd={(title, roleId) => {
          setDraft({
            benefits: addBenefit(draft.benefits, {
              key: `new-${benefitKey.current++}`,
              title,
              roleId,
            }),
          })
          setPicker(null)
        }}
        onSave={(index, title) => {
          setDraft({
            benefits: draft.benefits.map((benefit, i) =>
              i === index ? { ...benefit, title } : benefit
            ),
          })
          setPicker(null)
        }}
        onClose={() => setPicker(null)}
      />
    </div>
  )
}

function SectionHeading({
  title,
  hint,
  optional,
}: {
  title: string
  hint: string
  optional?: string
}) {
  return (
    <div>
      <h2 className="text-subtitle font-semibold text-foreground">
        {title}
        {optional ? (
          <span className="ms-1 text-label font-normal text-muted-foreground">
            {optional}
          </span>
        ) : null}
      </h2>
      <p className="mt-1 text-label leading-5 text-muted-foreground">{hint}</p>
    </div>
  )
}

function Field({
  id,
  label,
  required,
  optional,
  aside,
  hint,
  error,
  errorTone = 'error',
  children,
}: {
  id: string
  label: string
  /** Screen-reader word for the visual asterisk. */
  required?: string
  optional?: string
  aside?: string
  hint?: string
  error?: string | null
  errorTone?: 'error' | 'warning'
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-label font-semibold text-foreground"
        >
          {label}
          {required ? (
            <>
              {' '}
              <span aria-hidden className="text-destructive">
                *
              </span>
              <span className="sr-only">{required}</span>
            </>
          ) : null}
          {optional ? (
            <span className="ms-1 font-normal text-muted-foreground">
              {optional}
            </span>
          ) : null}
        </label>
        {aside ? (
          <span className="text-caption text-muted-foreground">{aside}</span>
        ) : null}
      </div>
      {hint ? (
        <p className="mb-3 text-label leading-5 text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p
          role={errorTone === 'error' ? 'alert' : undefined}
          className={cn(
            'mt-2 flex items-center gap-1.5 text-caption font-medium',
            errorTone === 'error'
              ? 'text-destructive'
              : 'text-amber-700 dark:text-amber-300'
          )}
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

function SwitchRow({
  id,
  title,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string
  title: string
  hint: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label
          htmlFor={id}
          className="text-label font-semibold text-foreground"
        >
          {title}
        </label>
        <p
          id={`${id}-hint`}
          className="mt-1 text-caption leading-5 text-muted-foreground"
        >
          {hint}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        aria-describedby={`${id}-hint`}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}
