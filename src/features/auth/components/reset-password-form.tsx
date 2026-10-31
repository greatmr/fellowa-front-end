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
import { useConfirmPasswordResetMutation } from '@/features/auth/api/auth-hooks'
import { hookFeedback } from '@/features/auth/lib/hook-feedback'
import { authHref } from '@/features/auth/lib/return-to'
import { createResetPasswordSchema } from '@/features/auth/schemas'
import { Link } from '@/i18n/navigation'

import { AuthFeedback } from './auth-feedback'
import { AuthFormControl } from './auth-form-control'
import { PasswordInput } from './password-input'

const EMPTY = { token: '', newPassword: '' }

/**
 * The backend emails a bare token and no link, so the token is pasted here. It
 * stays in form state only, never in the URL or any storage, and is dropped on
 * success. A reset does not sign in: the backend returns no session.
 */
export function ResetPasswordForm({ returnTo }: { returnTo?: string }) {
  const t = useTranslations('auth')
  const submitting = useRef(false)
  const [done, setDone] = useState(false)
  const mutation = useConfirmPasswordResetMutation()
  const pending = mutation.isPending
  const state = hookFeedback(mutation.error)
  const form = useForm<typeof EMPTY>({
    resolver: zodResolver(
      createResetPasswordSchema({
        token: t('validation.resetToken'),
        passwordLength: t('validation.passwordLength'),
      })
    ),
    defaultValues: EMPTY,
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || pending) return
    submitting.current = true
    void form.handleSubmit(
      (values) =>
        mutation.mutate(values, {
          onSuccess: () => {
            mutation.reset()
            form.reset(EMPTY)
            setDone(true)
          },
          onSettled: () => {
            submitting.current = false
          },
        }),
      () => {
        submitting.current = false
      }
    )(event)
  }

  if (done) {
    return (
      <div className="space-y-6">
        <h1 className="text-center text-headline font-bold">
          {t('reset.doneTitle')}
        </h1>
        <p
          role="status"
          className="rounded-md border border-success-border bg-success-subtle p-3 text-body text-success-emphasis"
        >
          {t('reset.done')}
        </p>
        <Button asChild size="lg" variant="inverse" className="w-full">
          <Link href={authHref('/auth/login', returnTo)}>
            {t('reset.login')}
          </Link>
        </Button>
      </div>
    )
  }

  const invalidToken =
    state.status === 'error' && state.error === 'invalidResetToken'

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-headline font-bold">{t('reset.title')}</h1>
        <p className="text-body text-muted-foreground">
          {t('reset.description')}
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={submit}
          noValidate
          aria-busy={pending}
          className="space-y-5"
        >
          <fieldset disabled={pending} className="min-w-0 space-y-5">
            <FormField
              control={form.control}
              name="token"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('fields.resetToken')}</FormLabel>
                  <AuthFormControl serverError={invalidToken}>
                    <Input
                      {...field}
                      type="text"
                      dir="ltr"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                      aria-invalid={fieldState.invalid || invalidToken}
                    />
                  </AuthFormControl>
                  <FormDescription>{t('reset.tokenHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('fields.newPassword')}</FormLabel>
                  <PasswordInput
                    {...field}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    aria-invalid={fieldState.invalid}
                  />
                  <FormDescription>{t('password.hint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </fieldset>
          {!pending && <AuthFeedback state={state} />}
          <Button
            type="submit"
            size="lg"
            variant="inverse"
            className="w-full"
            disabled={pending}
          >
            {pending && (
              <LoaderCircleIcon
                className="animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            )}
            {t(pending ? 'reset.pending' : 'reset.submit')}
          </Button>
        </form>
      </Form>
      <p className="text-center text-body text-muted-foreground">
        {t('reset.needToken')}{' '}
        <Link
          href={authHref('/auth/forgot-password', returnTo)}
          className="rounded-sm font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {t('reset.requestToken')}
        </Link>
      </p>
    </div>
  )
}
