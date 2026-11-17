'use client'

import {
  AlertCircleIcon,
  CheckIcon,
  LoaderCircleIcon,
  XIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  authKeys,
  useAliasAvailabilityQuery,
  useSetAliasMutation,
} from '@/features/auth/api/auth-hooks'
import { SIGN_UP_STEPS } from '@/features/auth/lib/auth-steps'
import {
  addressFormatStatus,
  addressFromName,
  addressStatus,
  canSaveAddress,
  cleanAddressInput,
  type AddressStatus,
} from '@/features/auth/lib/page-address'
import {
  addressStepStandsAlone,
  safeReturnTo,
} from '@/features/auth/lib/return-to'
import { ALIAS_MIN_LENGTH } from '@/features/auth/schemas'
import { Link, useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

import { AuthErrorLine } from './auth-error-line'
import { useAuthFlow } from './auth-flow-context'
import { AuthScreenHeading, AuthStepIndicator } from './auth-heading'
import { PhoneFeedback } from './phone-ui'

/** The prototype checks 400 ms after typing stops. */
const CHECK_DELAY_MS = 400

function useSettled(value: string) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), CHECK_DELAY_MS)
    return () => clearTimeout(timer)
  }, [value])
  return settled
}

const BAD: readonly AddressStatus[] = [
  'tooShort',
  'invalid',
  'taken',
  'reserved',
]

/**
 * Step 2 of 2 of sign-up, or on its own from settings or the studio checklist
 * (presentation `OnboardingUrlScreen` @ fdb5f6c; FE-ONB-02): the page's
 * address, checked as it is typed (`GET /auth/alias/availability`, BE-AUTH-09)
 * and saved with `PUT /auth/alias`, which creates the page. The live preview
 * in the visual column follows the field. The name comes from the owner
 * profile, so a Google sign-up or a reload still shows it (FE-AUTH-06); the
 * in-memory name from the account step covers a profile read without one.
 * The address is shown as `@username` (FQ-18): public pages are
 * `/creators/:id`, so no `fellowa.ir/<alias>` link exists to promise.
 */
export function PageAddressForm({
  destination,
  returnTo,
  profileName,
}: {
  /** Where the account goes once the page has its address. */
  destination: string
  returnTo?: string
  /** The owner profile's `displayName`; `null` while it is the placeholder. */
  profileName: string | null
}) {
  const t = useTranslations('auth.url')
  const toastT = useTranslations('auth.phone.toast')
  const router = useRouter()
  const statusId = useId()
  const { pageName, setPageName, setPageAddress } = useAuthFlow()
  const name = profileName ?? pageName
  // Opened from settings or the studio checklist rather than sign-up
  // (FE-ONB-02): no step count, and "back" returns there.
  const inSignUp = !addressStepStandsAlone(returnTo)
  // A Latin page name gives a first address, as in the prototype.
  const [value, setValue] = useState(() => addressFromName(name))
  const [dropped, setDropped] = useState(false)
  const [takenOnSave, setTakenOnSave] = useState<string | null>(null)
  const submitting = useRef(false)
  const save = useSetAliasMutation()
  const queryClient = useQueryClient()

  const settledValue = useSettled(value)
  // No request for an address the format already rules out.
  const check = useAliasAvailabilityQuery(
    settledValue,
    addressFormatStatus(settledValue) === 'unchecked'
  )
  const status = addressStatus({
    value,
    settled: settledValue === value,
    checking: check.isLoading,
    answer: settledValue === value ? check.data : undefined,
    takenOnSave,
  })
  const suggestions =
    status === 'taken' && check.data?.alias === value
      ? check.data.suggestions
      : []

  // The preview in the visual column shows the name and what is typed.
  useEffect(() => {
    setPageName(name)
  }, [name, setPageName])
  useEffect(() => {
    setPageAddress(value)
  }, [value, setPageAddress])

  function change(raw: string) {
    const cleaned = cleanAddressInput(raw)
    setValue(cleaned.value)
    setDropped(cleaned.dropped)
    if (save.error) save.reset()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || save.isPending || !canSaveAddress(status)) return
    submitting.current = true
    save.mutate(
      { alias: value },
      {
        onSuccess: () => {
          toast.success(toastT('pageCreated'))
          router.replace(destination)
        },
        onError: (error) => {
          submitting.current = false
          if (error.code === 'AUTH_ALIAS_TAKEN') {
            setTakenOnSave(value)
            // The earlier "available" was a snapshot; ask again next time.
            void queryClient.invalidateQueries({
              queryKey: authKeys.aliasAvailability(value),
            })
          }
        },
      }
    )
  }

  const pending = save.isPending
  const rejected = save.error?.status === 400
  const handledInField = save.error?.code === 'AUTH_ALIAS_TAKEN' || rejected
  const bad = BAD.includes(status) || rejected

  return (
    <div className="w-full">
      {inSignUp ? (
        <AuthStepIndicator current={2} total={SIGN_UP_STEPS} />
      ) : null}
      <AuthScreenHeading
        tone="inverse"
        title={t('title')}
        description={t('description')}
        className="mb-7"
      />
      <form
        onSubmit={submit}
        noValidate
        aria-busy={pending}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="page-address"
            className="mb-1.5 block text-body-sm font-semibold text-foreground"
          >
            {t('label')}
          </label>
          <div
            dir="ltr"
            className={cn(
              'flex h-12 w-full items-center rounded-xl border bg-background px-4 transition-[border-color,box-shadow]',
              bad
                ? 'border-destructive ring-[3px] ring-destructive/15'
                : status === 'available'
                  ? 'border-success ring-[3px] ring-success/15'
                  : 'border-input focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50'
            )}
          >
            <span className="me-0.5 text-body-lg font-medium text-muted-foreground select-none">
              {t('prefix')}
            </span>
            <input
              id="page-address"
              type="text"
              dir="ltr"
              value={value}
              onChange={(event) => change(event.target.value)}
              placeholder={t('placeholder')}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              readOnly={pending}
              aria-invalid={bad || undefined}
              aria-describedby={statusId}
              className="h-full min-w-0 flex-1 bg-transparent text-body-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground/70"
            />
            <span className="ms-2 flex shrink-0 items-center" aria-hidden>
              {status === 'checking' && (
                <LoaderCircleIcon className="size-4 animate-spin text-link motion-reduce:animate-none" />
              )}
              {status === 'available' && (
                <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                  <CheckIcon className="size-3.5" strokeWidth={3} />
                </span>
              )}
              {(status === 'taken' || status === 'reserved') && (
                <XIcon className="size-5 text-destructive" strokeWidth={2.5} />
              )}
            </span>
          </div>

          {dropped && (
            <p className="mt-2 flex items-center gap-1.5 text-body-sm font-medium text-warning-emphasis">
              <AlertCircleIcon className="size-3.5" aria-hidden />
              {t('chars')}
            </p>
          )}

          <div id={statusId} role="status" aria-live="polite">
            {status === 'available' && (
              <span className="sr-only">{t('available')}</span>
            )}
            {(status === 'tooShort' || status === 'invalid') && (
              <AuthErrorLine className="mt-2 text-body-sm">
                {status === 'tooShort'
                  ? t('tooShort', { min: ALIAS_MIN_LENGTH })
                  : t('chars')}
              </AuthErrorLine>
            )}
            {status === 'reserved' && (
              <AuthErrorLine className="mt-2 text-body-sm">
                {t('reserved')}
              </AuthErrorLine>
            )}
            {rejected && status !== 'tooShort' && (
              <AuthErrorLine className="mt-2 text-body-sm">
                {t('rejected')}
              </AuthErrorLine>
            )}
            {status === 'taken' && (
              <div className="mt-2.5">
                <AuthErrorLine className="mb-2 text-body-sm">
                  {t('taken')}
                </AuthErrorLine>
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        dir="ltr"
                        onClick={() => change(suggestion)}
                        className="inline-flex items-center rounded-full bg-info-subtle px-3 py-1 text-label font-semibold text-info-emphasis transition-colors outline-none hover:bg-brand-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:hover:bg-brand-500/25"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {!pending && save.error && !handledInField && (
          <PhoneFeedback error={save.error} guarded />
        )}

        <div className="pt-2">
          <Button
            type="submit"
            variant="inverse"
            size="lg"
            className="h-12 w-full rounded-xl"
            disabled={!canSaveAddress(status) || pending}
          >
            {(pending || status === 'checking') && (
              <LoaderCircleIcon
                className="animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            )}
            {t(pending ? 'pending' : 'submit')}
          </Button>
        </div>

        <div className="text-center">
          <Link
            href={inSignUp ? '/auth/account' : safeReturnTo(returnTo)}
            className="rounded-sm text-body font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('back')}
          </Link>
        </div>
      </form>
    </div>
  )
}
