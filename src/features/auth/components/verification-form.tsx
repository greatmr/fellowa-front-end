'use client'

import { useRef, useState, type FormEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircleIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  useLogoutMutation,
  useResendEmailMutation,
  useVerifyEmailMutation,
} from '@/features/auth/api/auth-hooks'
import { hookFeedback } from '@/features/auth/lib/hook-feedback'
import { safeReturnTo } from '@/features/auth/lib/return-to'
import { createVerificationSchema } from '@/features/auth/schemas'
import { useRouter } from '@/i18n/navigation'
import { toLatinDigits } from '@/lib/digits'

import { AuthFeedback } from './auth-feedback'
import { AuthFormControl } from './auth-form-control'

export function VerificationForm({
  email,
  returnTo,
}: {
  email: string
  returnTo?: string
}) {
  const t = useTranslations('auth')
  const router = useRouter()
  const submitting = useRef(false)
  const [lastAction, setLastAction] = useState<
    'verify' | 'resend' | 'change-account' | null
  >(null)
  const verify = useVerifyEmailMutation()
  const resend = useResendEmailMutation()
  const changeAccount = useLogoutMutation()
  const pending =
    verify.isPending || resend.isPending || changeAccount.isPending
  const verifyState = hookFeedback(verify.error, true)
  const state =
    lastAction === 'verify'
      ? verifyState
      : lastAction === 'resend'
        ? hookFeedback(resend.error, true)
        : hookFeedback(changeAccount.error)
  const expired = state.status === 'error' && state.error === 'expiredSession'
  const disabled = pending || expired
  // The backend gives no end time, and a new code does not lift the lockout. By
  // the time it ends the old code has expired, so entry reopens with a new code;
  // the server still refuses until the lockout is over.
  const locked =
    verifyState.status === 'error' && verifyState.error === 'tooManyAttempts'
  const form = useForm<{ code: string }>({
    resolver: zodResolver(
      createVerificationSchema({
        email: t('validation.email'),
        passwordRequired: t('validation.passwordRequired'),
        passwordLength: t('validation.passwordLength'),
        code: t('validation.code'),
      })
    ),
    defaultValues: { code: '' },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || locked || submitting.current) return
    submitting.current = true
    setLastAction('verify')
    resend.reset()
    void form.handleSubmit(
      (values) =>
        verify.mutate(values, {
          onSuccess: () => {
            verify.reset()
            router.replace(safeReturnTo(returnTo))
          },
          onError: () => {
            submitting.current = false
          },
        }),
      () => {
        submitting.current = false
      }
    )(event)
  }

  function submitResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || submitting.current) return
    submitting.current = true
    setLastAction('resend')
    if (!locked) verify.reset()
    form.clearErrors('code')
    resend.mutate(undefined, {
      onSuccess: () => {
        verify.reset()
        // The previous code no longer works.
        form.reset({ code: '' })
        submitting.current = false
      },
      onError: (error) => {
        if (error.code === 'AUTH_ALREADY_VERIFIED') {
          // Verified elsewhere, for instance in another tab: nothing to resend.
          resend.reset()
          router.replace(safeReturnTo(returnTo))
          return
        }
        submitting.current = false
      },
    })
  }

  function submitChangeAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || submitting.current) return
    submitting.current = true
    setLastAction('change-account')
    verify.reset()
    resend.reset()
    changeAccount.mutate(undefined, {
      onSuccess: () => {
        changeAccount.reset()
        router.replace({
          pathname: '/auth/login',
          query: { returnTo: safeReturnTo(returnTo) },
        })
      },
      onError: () => {
        submitting.current = false
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-headline font-bold">{t('verify.title')}</h1>
        <p className="text-body text-muted-foreground">
          {t('verify.description')}
        </p>
        <p className="text-body font-semibold">
          <bdi dir="ltr">{email}</bdi>
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={submit}
          noValidate
          aria-busy={verify.isPending}
          className="space-y-5"
        >
          <fieldset disabled={disabled || locked} className="min-w-0">
            <FormField
              control={form.control}
              name="code"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('fields.code')}</FormLabel>
                  <AuthFormControl
                    serverError={
                      state.status === 'error' && state.error === 'invalidCode'
                    }
                  >
                    <Input
                      {...field}
                      onChange={(event) =>
                        field.onChange(toLatinDigits(event.target.value))
                      }
                      type="text"
                      dir="ltr"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      className="numeric text-center text-title tracking-widest"
                      aria-invalid={
                        fieldState.invalid ||
                        (state.status === 'error' &&
                          state.error === 'invalidCode')
                      }
                    />
                  </AuthFormControl>
                  <FormDescription>{t('verify.codeHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </fieldset>
          {(lastAction === 'verify' || locked) && !pending && (
            <AuthFeedback state={verifyState} returnTo={returnTo} />
          )}
          <Button
            type="submit"
            size="lg"
            variant="inverse"
            className="w-full"
            disabled={disabled || locked}
          >
            {verify.isPending && (
              <LoaderCircleIcon
                className="animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            )}
            {t(verify.isPending ? 'verify.pending' : 'verify.submit')}
          </Button>
        </form>
      </Form>
      <form
        onSubmit={submitResend}
        aria-busy={resend.isPending}
        className="space-y-3"
      >
        {lastAction === 'resend' && !pending && (
          <AuthFeedback state={state} returnTo={returnTo} />
        )}
        {lastAction === 'resend' && !pending && resend.isSuccess && (
          <p
            role="status"
            className="rounded-md border border-success-border bg-success-subtle p-3 text-body text-success-emphasis"
          >
            {t('verify.sent')}
          </p>
        )}
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={disabled}
        >
          {t(resend.isPending ? 'verify.resending' : 'verify.resend')}
        </Button>
      </form>
      <form
        onSubmit={submitChangeAccount}
        aria-busy={changeAccount.isPending}
        className="space-y-3 text-center"
      >
        {lastAction === 'change-account' && !pending && (
          <AuthFeedback state={state} returnTo={returnTo} />
        )}
        <Button type="submit" variant="link" disabled={pending}>
          {t(
            changeAccount.isPending ? 'nav.loggingOut' : 'verify.changeAccount'
          )}
        </Button>
      </form>
    </div>
  )
}
