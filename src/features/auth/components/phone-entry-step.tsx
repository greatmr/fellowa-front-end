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
import { authHref } from '@/features/auth/lib/return-to'
import { createPhoneSchema } from '@/features/auth/schemas'
import type { PhoneCodeSent } from '@/features/auth/types'
import { Link } from '@/i18n/navigation'

import { AuthFormControl } from './auth-form-control'
import { PhoneFeedback } from './phone-ui'

/**
 * Step 1 of phone sign-in (presentation `LoginOrSignupScreen` @ fdb5f6c): one
 * screen for signing in and signing up. Not ported: the Google button (Google
 * sign-in has no front-end flow yet) and the "last number on this browser"
 * variant (it lived in `localStorage`).
 */
export function PhoneEntryStep({
  initialPhone = '',
  returnTo,
  onCodeSent,
}: {
  initialPhone?: string
  returnTo?: string
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
      ({ phone }) =>
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
        ),
      () => {
        submitting.current = false
      }
    )(event)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-headline font-bold">{t('entry.title')}</h1>
        <p className="text-body text-muted-foreground">
          {t('entry.description')}
        </p>
      </div>
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
      <p className="text-center text-body text-muted-foreground">
        {t('entry.emailPrompt')}{' '}
        <Link
          href={authHref('/auth/login/email', returnTo)}
          className="rounded-sm font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {t('entry.emailLink')}
        </Link>
      </p>
      <p className="text-center text-label leading-relaxed text-muted-foreground">
        {t.rich('entry.legal', {
          strong: (chunks) => (
            <strong className="font-semibold text-foreground">{chunks}</strong>
          ),
        })}
      </p>
    </div>
  )
}
