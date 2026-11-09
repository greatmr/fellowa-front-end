'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircleIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, type FormEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useRequestPhoneCodeMutation } from '@/features/auth/api/auth-hooks'
import {
  normalizeIranianMobile,
  PHONE_INPUT_MAX,
} from '@/features/auth/lib/phone'
import type { GoogleErrorKind } from '@/features/auth/lib/google-error'
import { authHref } from '@/features/auth/lib/return-to'
import { createPhoneSchema } from '@/features/auth/schemas'
import type { PhoneCodeSent } from '@/features/auth/types'
import { Link } from '@/i18n/navigation'

import { AuthFormControl } from './auth-form-control'
import { AuthScreenHeading } from './auth-heading'
import { GoogleSignInButton } from './google-sign-in-button'
import { PhoneFeedback } from './phone-ui'

/**
 * Step 1 of phone sign-in (presentation `LoginOrSignupScreen` @ fdb5f6c): one
 * screen for signing in and signing up, Google first when it is configured,
 * then the number. Not ported: the "last number on this browser" variant (it
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
  const form = useForm({
    resolver: zodResolver(createPhoneSchema({ phone: t('validation.phone') })),
    defaultValues: { phone: initialPhone },
  })
  const typed = useWatch({ control: form.control, name: 'phone' })
  const valid = normalizeIranianMobile(typed) !== null

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
          <p
            role="alert"
            className="rounded-md border border-danger-border bg-danger-subtle p-3 text-body text-danger-emphasis"
          >
            {t(`googleErrors.${google.error}`)}
          </p>
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
                      onChange={(event) => {
                        field.onChange(event)
                        if (request.error) request.reset()
                      }}
                      onBlur={() => {
                        field.onBlur()
                        // As designed: complain about a typed number, not an
                        // empty field.
                        if (field.value) void form.trigger('phone')
                      }}
                      type="tel"
                      dir="ltr"
                      inputMode="tel"
                      autoComplete="tel"
                      autoFocus
                      maxLength={PHONE_INPUT_MAX}
                      placeholder={t('entry.placeholder')}
                      readOnly={pending}
                      aria-invalid={fieldState.invalid}
                      className="h-12 text-body-lg"
                    />
                  </AuthFormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!pending && <PhoneFeedback error={request.error} />}
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
