'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircleIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  useRef,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useRequestPhoneCodeMutation } from '@/features/auth/api/auth-hooks'
import {
  formatPhoneInput,
  normalizeIranianMobile,
  PHONE_INPUT_MAX,
  positionAfterSignificant,
  significantBefore,
} from '@/features/auth/lib/phone'
import type { GoogleErrorKind } from '@/features/auth/lib/google-error'
import { authHref } from '@/features/auth/lib/return-to'
import { createPhoneSchema } from '@/features/auth/schemas'
import type { PhoneCodeSent } from '@/features/auth/types'
import { Link } from '@/i18n/navigation'

import { AuthErrorLine, AuthFieldMessage } from './auth-error-line'
import { AuthFormControl } from './auth-form-control'
import { AuthScreenHeading } from './auth-heading'
import { GoogleSignInButton } from './google-sign-in-button'
import { PhoneFeedback, useLocaleDigits } from './phone-ui'

/**
 * Step 1 of phone sign-in (presentation `LoginOrSignupScreen` @ fdb5f6c): one
 * screen for signing in and signing up, Google first when it is configured,
 * then the number, grouped as it is typed (`0912 345 6789`, in the locale's
 * digits) and sent normalised. Not ported: the "last number on this browser" variant (it
 * lived in `localStorage`).
 */
export function PhoneEntryStep({
  initialPhone = '',
  returnTo,
  google,
  onResume,
  onCodeSent,
}: {
  initialPhone?: string
  returnTo?: string
  google?: { enabled: boolean; locale: string; error: GoogleErrorKind | null }
  /** `true` when the flow can continue with `phone` without a new code. */
  onResume?: (phone: string) => boolean
  onCodeSent: (sent: PhoneCodeSent) => void
}) {
  const t = useTranslations('auth.phone')
  const submitting = useRef(false)
  const request = useRequestPhoneCodeMutation()
  const pending = request.isPending
  const localeDigits = useLocaleDigits()
  const display = (raw: string) => localeDigits(formatPhoneInput(raw))
  const form = useForm({
    resolver: zodResolver(createPhoneSchema({ phone: t('validation.phone') })),
    defaultValues: { phone: display(initialPhone) },
  })
  const typed = useWatch({ control: form.control, name: 'phone' })
  const valid = normalizeIranianMobile(typed) !== null

  /**
   * Regroups the field and puts the caret back beside the digit it followed:
   * React's rewrite of a controlled value would send it to the end.
   */
  function rewrite(
    input: HTMLInputElement,
    raw: string,
    caretAfter: number,
    onChange: (value: string) => void
  ) {
    onChange(display(raw))
    if (request.error) request.reset()
    requestAnimationFrame(() => {
      if (input.ownerDocument.activeElement !== input) return
      const at = positionAfterSignificant(input.value, caretAfter)
      input.setSelectionRange(at, at)
    })
  }

  function change(
    event: ChangeEvent<HTMLInputElement>,
    onChange: (value: string) => void
  ) {
    const input = event.currentTarget
    const caret = input.selectionStart ?? input.value.length
    rewrite(input, input.value, significantBefore(input.value, caret), onChange)
  }

  /** A group space is not something the person typed: delete past it. */
  function deleteAcrossSpace(
    event: KeyboardEvent<HTMLInputElement>,
    onChange: (value: string) => void
  ) {
    const input = event.currentTarget
    const { selectionStart: start, selectionEnd: end, value } = input
    if (input.readOnly || start === null || start !== end) return
    const back = event.key === 'Backspace' && value.charAt(start - 1) === ' '
    const forward = event.key === 'Delete' && value.charAt(start) === ' '
    if (!back && !forward) return
    event.preventDefault()
    const at = back ? start - 2 : start + 1
    if (at < 0 || at >= value.length) return
    rewrite(
      input,
      value.slice(0, at) + value.slice(at + 1),
      significantBefore(value, at),
      onChange
    )
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || pending) return
    submitting.current = true
    void form.handleSubmit(
      ({ phone }) => {
        if (onResume?.(phone)) {
          submitting.current = false
          return
        }
        request.mutate(
          { phone },
          {
            onSuccess: (sent) => {
              request.reset()
              onCodeSent(sent)
            },
            onSettled: () => {
              submitting.current = false
            },
          }
        )
      },
      () => {
        submitting.current = false
      }
    )(event)
  }

  const googleEnabled = google?.enabled === true

  return (
    <div className="w-full">
      <AuthScreenHeading
        title={t('entry.title')}
        description={t(
          googleEnabled ? 'entry.descriptionWithGoogle' : 'entry.description'
        )}
        className="mb-6"
      />
      <div className="space-y-4">
        {google?.error ? (
          <AuthErrorLine role="alert">
            {t(`googleErrors.${google.error}`)}
          </AuthErrorLine>
        ) : null}
        {googleEnabled ? (
          <>
            <GoogleSignInButton locale={google.locale} returnTo={returnTo} />
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-border" />
              <span className="absolute bg-card px-3 text-body-sm font-medium text-muted-foreground">
                {t('entry.divider')}
              </span>
            </div>
          </>
        ) : null}
        <Form {...form}>
          <form
            onSubmit={submit}
            noValidate
            aria-busy={pending}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="phone"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('entry.label')}</FormLabel>
                  <AuthFormControl serverError={false}>
                    <Input
                      {...field}
                      onChange={(event) => change(event, field.onChange)}
                      onKeyDown={(event) =>
                        deleteAcrossSpace(event, field.onChange)
                      }
                      onBlur={() => {
                        field.onBlur()
                        // As designed: complain about a typed number, not an
                        // empty field.
                        if (field.value) void form.trigger('phone')
                      }}
                      type="tel"
                      dir="ltr"
                      inputMode="numeric"
                      autoComplete="tel"
                      autoFocus
                      maxLength={PHONE_INPUT_MAX}
                      placeholder={t('entry.placeholder')}
                      readOnly={pending}
                      aria-invalid={
                        fieldState.invalid || (!pending && request.isError)
                      }
                      className="h-12 text-body-lg"
                    />
                  </AuthFormControl>
                  <AuthFieldMessage />
                  {!pending && <PhoneFeedback error={request.error} />}
                </FormItem>
              )}
            />
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full"
              disabled={!valid || pending}
            >
              {pending && (
                <LoaderCircleIcon
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              )}
              {t(pending ? 'entry.pending' : 'entry.submit')}
            </Button>
          </form>
        </Form>
        <p className="pt-2 text-center text-body text-muted-foreground">
          {t('entry.emailPrompt')}{' '}
          <Link
            href={authHref('/auth/login/email', returnTo)}
            className="rounded-sm font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('entry.emailLink')}
          </Link>
        </p>
        <p className="pt-4 text-center text-label leading-relaxed text-muted-foreground">
          {t.rich('entry.legal', {
            strong: (chunks) => (
              <strong className="font-semibold text-foreground">
                {chunks}
              </strong>
            ),
          })}
        </p>
      </div>
    </div>
  )
}
