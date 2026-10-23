'use client'

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
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
import { createVerificationSchema } from '@/features/auth/schemas'
import type { AuthActionState, AuthFormAction } from '@/features/auth/types'

import { AuthFeedback } from './auth-feedback'
import { AuthFormControl } from './auth-form-control'

export function VerificationForm({
  email,
  verifyAction,
  resendAction,
  changeAccountAction,
  returnTo,
  permalink,
  initialState,
}: {
  email: string
  verifyAction: AuthFormAction
  resendAction: AuthFormAction
  changeAccountAction: AuthFormAction
  returnTo?: string
  permalink?: string
  initialState?: AuthActionState
}) {
  const t = useTranslations('auth')
  const submitting = useRef(false)
  const [lastAction, setLastAction] = useState<
    'verify' | 'resend' | 'change-account' | null
  >(null)
  const [state, verify, verifying] = useActionState<AuthActionState, FormData>(
    verifyAction,
    initialState?.status === 'sent'
      ? { status: 'idle' }
      : (initialState ?? { status: 'idle' }),
    permalink
  )
  const [resendState, resend, resending] = useActionState<
    AuthActionState,
    FormData
  >(
    resendAction,
    initialState?.status === 'sent' ? initialState : { status: 'idle' },
    permalink
  )
  const [changeAccountState, changeAccount, changingAccount] = useActionState(
    changeAccountAction,
    { status: 'idle' },
    permalink
  )
  // Native pre-hydration submissions return action state without running the
  // client submit handlers. Derive their feedback from that returned state.
  let activeAction = lastAction ?? 'verify'
  if (lastAction === null && resendState.status !== 'idle')
    activeAction = 'resend'
  if (lastAction === null && changeAccountState.status !== 'idle')
    activeAction = 'change-account'
  const queryClient = useQueryClient()
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
  const expired = [state, resendState].some(
    (value) => value.status === 'error' && value.error === 'expiredSession'
  )
  const pending = verifying || resending || changingAccount
  useEffect(() => {
    if (!pending) submitting.current = false
  }, [pending, state, resendState, changeAccountState])
  const disabled = pending || expired
  const codeError =
    activeAction === 'verify' && state.status === 'error'
      ? state.fieldErrors?.code
      : undefined

  function submit(event: FormEvent<HTMLFormElement>) {
    const element = event.currentTarget
    if (disabled || submitting.current) {
      event.preventDefault()
      return
    }
    submitting.current = true
    void form.handleSubmit(
      () => {
        const data = new FormData(element)
        setLastAction('verify')
        queryClient.clear()
        startTransition(() => verify(data))
      },
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
    form.clearErrors('code')
    startTransition(() => resend(new FormData()))
  }

  function submitChangeAccount(event: FormEvent<HTMLFormElement>) {
    if (pending || submitting.current) {
      event.preventDefault()
      return
    }
    submitting.current = true
    setLastAction('change-account')
    queryClient.clear()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-headline font-extrabold">{t('verify.title')}</h1>
        <p className="text-body text-muted-foreground">
          {t('verify.description')}
        </p>
        <p className="text-body font-semibold">
          <bdi dir="ltr">{email}</bdi>
        </p>
      </div>
      <Form {...form}>
        <form
          action={verify}
          onSubmit={submit}
          noValidate
          aria-busy={verifying}
          className="space-y-5"
        >
          <fieldset disabled={disabled} className="min-w-0">
            <FormField
              control={form.control}
              name="code"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('fields.code')}</FormLabel>
                  <AuthFormControl serverError={Boolean(codeError)}>
                    <Input
                      {...field}
                      type="text"
                      dir="ltr"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      className="numeric text-center text-title tracking-widest"
                      aria-invalid={fieldState.invalid || Boolean(codeError)}
                    />
                  </AuthFormControl>
                  <FormDescription>{t('verify.codeHint')}</FormDescription>
                  <FormMessage>
                    {codeError ? t(`validation.${codeError}`) : undefined}
                  </FormMessage>
                </FormItem>
              )}
            />
          </fieldset>
          {activeAction === 'verify' && !pending && (
            <AuthFeedback state={state} returnTo={returnTo} />
          )}
          <Button
            type="submit"
            size="lg"
            variant="inverse"
            className="w-full"
            disabled={disabled}
          >
            {verifying && (
              <LoaderCircleIcon
                className="animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            )}
            {t(verifying ? 'verify.pending' : 'verify.submit')}
          </Button>
        </form>
      </Form>
      <form
        action={resend}
        onSubmit={submitResend}
        aria-busy={resending}
        className="space-y-3"
      >
        <input type="hidden" name="returnTo" value={returnTo ?? '/studio'} />
        {activeAction === 'resend' && !pending && (
          <AuthFeedback state={resendState} returnTo={returnTo} />
        )}
        {activeAction === 'resend' &&
          !pending &&
          resendState.status === 'sent' && (
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
          {t(resending ? 'verify.resending' : 'verify.resend')}
        </Button>
      </form>
      <form
        action={changeAccount}
        onSubmit={submitChangeAccount}
        aria-busy={changingAccount}
        className="space-y-3 text-center"
      >
        {activeAction === 'change-account' && !pending && (
          <AuthFeedback state={changeAccountState} returnTo={returnTo} />
        )}
        <Button type="submit" variant="link" disabled={pending}>
          {t(changingAccount ? 'nav.loggingOut' : 'verify.changeAccount')}
        </Button>
      </form>
    </div>
  )
}
