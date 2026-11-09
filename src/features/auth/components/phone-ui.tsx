'use client'

import { useFormatter, useTranslations } from 'next-intl'

import { hookFeedback } from '@/features/auth/lib/hook-feedback'
import { phoneGroups } from '@/features/auth/lib/phone'
import type { ApiError } from '@/lib/api/errors'

import { AuthFeedback } from './auth-feedback'

type Format = ReturnType<typeof useFormatter>

/** Digits in the active locale, leading zeros kept (`0912` → `۰۹۱۲` in fa). */
function digits(format: Format, value: string) {
  return format.number(Number(value), {
    minimumIntegerDigits: value.length,
    useGrouping: false,
  })
}

/** `m:ss`, in the active locale's digits. */
export function useDuration() {
  const format = useFormatter()
  return (totalSeconds: number) => {
    const seconds = Math.max(0, Math.ceil(totalSeconds))
    return `${format.number(Math.floor(seconds / 60))}:${digits(
      format,
      String(seconds % 60).padStart(2, '0')
    )}`
  }
}

/** A normalised `09…` number, grouped as the prototype shows it. */
export function PhoneNumber({ phone }: { phone: string }) {
  const format = useFormatter()
  return (
    <bdi dir="ltr" className="font-semibold whitespace-nowrap text-foreground">
      {phoneGroups(phone)
        .map((group) => digits(format, group))
        .join(' ')}
    </bdi>
  )
}

/**
 * The phone screens' error line: their own copy for the phone codes (with the
 * wait time when the API gave one), the shared auth copy otherwise.
 */
export function PhoneFeedback({
  error,
  guarded = false,
}: {
  error: ApiError | null
  guarded?: boolean
}) {
  const t = useTranslations('auth.phone.errors')
  const duration = useDuration()
  const state = hookFeedback(error, guarded)
  if (state.status !== 'error') return null

  const key = state.error
  if (key !== 'codeRateLimited' && key !== 'codeLocked' && !t.has(key)) {
    return <AuthFeedback state={state} />
  }
  const wait = error?.retryAfterSeconds
  const message =
    key === 'codeRateLimited' || key === 'codeLocked'
      ? wait
        ? t(key, { time: duration(wait) })
        : t(`${key}NoTime`)
      : t(key)

  return (
    <p
      role="alert"
      className="rounded-md border border-danger-border bg-danger-subtle p-3 text-body text-danger-emphasis"
    >
      {message}
    </p>
  )
}
