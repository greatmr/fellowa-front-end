'use client'

import { KeyRoundIcon, LoaderCircleIcon } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'

import { Button } from '@/components/ui/button'
import {
  useRequestPhoneCodeMutation,
  useVerifyPhoneCodeMutation,
} from '@/features/auth/api/auth-hooks'
import { PHONE_CODE_LENGTH } from '@/features/auth/schemas'
import { deadlineIn, type Deadline } from '@/features/auth/lib/phone'
import type { PhoneSignIn } from '@/features/auth/types'
import { toLatinDigits } from '@/lib/digits'
import { cn } from '@/lib/utils'

import { PhoneFeedback, PhoneNumber, useDuration } from './phone-ui'

const empty = () => Array<string>(PHONE_CODE_LENGTH).fill('')

/** Whole seconds until `until`, counting down once a second. */
function useSecondsLeft({ until, setAt }: Deadline) {
  // A remount (back from the password step) counts from now, not `setAt`.
  const [clock, setClock] = useState(() => ({ until, now: Date.now() }))
  // A new deadline counts from when it was set, not from the last tick.
  if (clock.until !== until) setClock({ until, now: setAt })
  const left = Math.max(0, Math.ceil((until - clock.now) / 1000))
  useEffect(() => {
    if (left <= 0) return
    const timer = setInterval(
      () => setClock((current) => ({ ...current, now: Date.now() })),
      1000
    )
    return () => clearInterval(timer)
  }, [left])
  return left
}

/**
 * Step 2a (presentation `VerifyCodeScreen` @ fdb5f6c): the 5-digit SMS code,
 * pasted or typed, submitted as soon as it is complete. Not ported: the demo
 * code banner and its auto-fill button (mock only).
 */
export function PhoneCodeStep({
  phone,
  hasPassword,
  wait,
  onResent,
  onSignedIn,
  onEditPhone,
  onUsePassword,
}: {
  phone: string
  hasPassword: boolean
  /** Until a new code may be asked for. */
  wait: Deadline
  onResent: (wait: Deadline) => void
  onSignedIn: (result: PhoneSignIn) => void
  onEditPhone: () => void
  onUsePassword: () => void
}) {
  const t = useTranslations('auth.phone')
  const format = useFormatter()
  const duration = useDuration()
  const labelId = useId()
  const verify = useVerifyPhoneCodeMutation()
  const resend = useRequestPhoneCodeMutation()
  const [digits, setDigits] = useState(empty)
  const [shake, setShake] = useState(false)
  // Locked out by the server: entry closes until a new code is sent.
  const [locked, setLocked] = useState(false)
  const [lastAction, setLastAction] = useState<'verify' | 'resend' | null>(null)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const submitting = useRef(false)
  const secondsLeft = useSecondsLeft(wait)
  const pending = verify.isPending || resend.isPending
  const code = digits.join('')
  const complete = /^\d+$/.test(code) && code.length === PHONE_CODE_LENGTH

  const focus = (index: number) => inputs.current[index]?.focus()
  /** After a re-render that may re-enable the boxes. */
  const focusSoon = (index: number) => setTimeout(() => focus(index), 0)

  function submit(value: string) {
    if (submitting.current || pending || locked) return
    if (value.length !== PHONE_CODE_LENGTH) return
    // `isPending` lags a tick behind `mutate`; an autofill or Enter in that
    // tick would spend a second attempt on a single-use code.
    submitting.current = true
    setLastAction('verify')
    resend.reset()
    verify.mutate(
      { phone, code: value },
      {
        onSuccess: (result) => onSignedIn(result),
        onError: (error) => {
          submitting.current = false
          if (error.code === 'AUTH_CODE_INVALID') {
            setShake(true)
            setDigits(empty())
            focus(0)
          } else if (error.code === 'AUTH_CODE_EXPIRED') {
            setDigits(empty())
            focusSoon(0)
          } else if (error.code === 'AUTH_CODE_TOO_MANY_ATTEMPTS') {
            setLocked(true)
            if (error.retryAfterSeconds) {
              onResent(deadlineIn(error.retryAfterSeconds))
            }
          }
        },
      }
    )
  }

  /** Writes `value` from `start`, then submits a complete code. */
  function fill(start: number, value: string) {
    const next = [...digits]
    for (let i = 0; i < value.length && start + i < PHONE_CODE_LENGTH; i++) {
      next[start + i] = value[i] ?? ''
    }
    setDigits(next)
    if (verify.error) verify.reset()
    const joined = next.join('')
    if (joined.length === PHONE_CODE_LENGTH && next.every(Boolean)) {
      submit(joined)
    } else {
      focus(Math.min(start + value.length, PHONE_CODE_LENGTH - 1))
    }
  }

  function change(index: number, raw: string) {
    const typed = toLatinDigits(raw).replace(/\D/g, '')
    if (typed.length >= PHONE_CODE_LENGTH) {
      // A one-time-code autofill lands the whole code in one box.
      fill(0, typed.slice(0, PHONE_CODE_LENGTH))
      return
    }
    if (!typed) {
      const next = [...digits]
      next[index] = ''
      setDigits(next)
      return
    }
    // Typing into a filled box: keep the new digit wherever the caret was.
    const previous = digits[index]
    const fresh =
      previous && typed.length > 1 ? typed.replace(previous, '') : typed
    fill(index, fresh.slice(-1))
  }

  function keyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      focus(index - 1)
    }
  }

  function paste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    if (locked || pending) return
    const pasted = toLatinDigits(event.clipboardData.getData('text'))
      .replace(/\D/g, '')
      .slice(0, PHONE_CODE_LENGTH)
    if (pasted) fill(0, pasted)
  }

  function requestNewCode() {
    if (pending || secondsLeft > 0) return
    setLastAction('resend')
    verify.reset()
    resend.mutate(
      { phone },
      {
        onSuccess: (sent) => {
          setLocked(false)
          setDigits(empty())
          onResent(deadlineIn(sent.resendAfterSeconds))
          focusSoon(0)
        },
        onError: (error) => {
          if (error.retryAfterSeconds) {
            onResent(deadlineIn(error.retryAfterSeconds))
          }
        },
      }
    )
  }

  const verifyFailed = lastAction === 'verify' && verify.isError
  const wrong = verifyFailed && verify.error?.code === 'AUTH_CODE_INVALID'
  const entryClosed = locked || pending

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-headline font-bold">{t('code.title')}</h1>
        <p className="text-body leading-relaxed text-muted-foreground">
          {t.rich('code.sentTo', {
            length: PHONE_CODE_LENGTH,
            phone: () => <PhoneNumber phone={phone} />,
          })}{' '}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 font-bold"
            onClick={onEditPhone}
            disabled={pending}
          >
            {t('code.editNumber')}
          </Button>
        </p>
      </div>

      <form
        noValidate
        aria-busy={verify.isPending}
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit(code)
        }}
      >
        <div role="group" aria-labelledby={labelId} className="space-y-3">
          <p id={labelId} className="sr-only">
            {t('code.label')}
          </p>
          <div
            dir="ltr"
            data-shake={shake || undefined}
            onAnimationEnd={() => setShake(false)}
            className={cn(
              'flex justify-center gap-2.5 sm:gap-3',
              shake && 'animate-shake motion-reduce:animate-none'
            )}
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputs.current[index] = element
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                autoFocus={index === 0}
                aria-label={t('code.digit', {
                  index: index + 1,
                  total: PHONE_CODE_LENGTH,
                })}
                aria-invalid={wrong || undefined}
                value={digit ? format.number(Number(digit)) : ''}
                onChange={(event) => change(index, event.target.value)}
                onKeyDown={(event) => keyDown(index, event)}
                onPaste={paste}
                onFocus={(event) => event.target.select()}
                disabled={locked}
                readOnly={pending}
                className={cn(
                  'h-13 w-12 rounded-xl border bg-muted text-center text-title font-bold text-foreground transition-[color,box-shadow,border-color] outline-none sm:h-14 sm:w-13',
                  'focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  digit ? 'border-primary bg-background' : 'border-input',
                  'aria-invalid:border-destructive aria-invalid:ring-destructive/20'
                )}
              />
            ))}
          </div>
        </div>

        {lastAction === 'verify' && !pending && (
          <PhoneFeedback error={verify.error} />
        )}
        {lastAction === 'resend' && !pending && (
          <>
            <PhoneFeedback error={resend.error} />
            {resend.isSuccess && (
              <p
                role="status"
                className="rounded-md border border-success-border bg-success-subtle p-3 text-body text-success-emphasis"
              >
                {t('code.sent')}
              </p>
            )}
          </>
        )}

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full"
          disabled={!complete || entryClosed}
        >
          {verify.isPending && (
            <LoaderCircleIcon
              className="animate-spin motion-reduce:animate-none"
              aria-hidden
            />
          )}
          {t(verify.isPending ? 'code.pending' : 'code.submit')}
        </Button>
      </form>

      {hasPassword && (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={onUsePassword}
          disabled={pending}
        >
          <KeyRoundIcon className="text-link" aria-hidden />
          {t('code.usePassword')}
        </Button>
      )}

      <div className="text-center">
        {secondsLeft > 0 ? (
          <p className="text-body-sm font-medium text-muted-foreground">
            {t('code.resendIn', { time: duration(secondsLeft) })}
          </p>
        ) : (
          <Button
            type="button"
            variant="link"
            onClick={requestNewCode}
            disabled={pending}
          >
            {t(resend.isPending ? 'code.resending' : 'code.resend')}
          </Button>
        )}
      </div>
    </div>
  )
}
