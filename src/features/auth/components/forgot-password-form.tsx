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
import { useRequestPasswordResetMutation } from '@/features/auth/api/auth-hooks'
import { hookFeedback } from '@/features/auth/lib/hook-feedback'
import { authHref } from '@/features/auth/lib/return-to'
import { createForgotPasswordSchema } from '@/features/auth/schemas'
import { Link } from '@/i18n/navigation'

import { AuthFeedback } from './auth-feedback'
import { AuthFormControl } from './auth-form-control'

/**
 * Asks for a reset token. The backend answers the same for an unknown email,
 * so the confirmation never says that an account exists.
 */
export function ForgotPasswordForm({ returnTo }: { returnTo?: string }) {
  const t = useTranslations('auth')
  const submitting = useRef(false)
  const [sent, setSent] = useState(false)
  const mutation = useRequestPasswordResetMutation()
  const pending = mutation.isPending
  const form = useForm<{ email: string }>({
    resolver: zodResolver(
      createForgotPasswordSchema({ email: t('validation.email') })
    ),
    defaultValues: { email: '' },
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
            form.reset()
            setSent(true)
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

  const backToLogin = (
    <p className="text-center text-body">
      <Link
        href={authHref('/auth/login', returnTo)}
        className="rounded-sm font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        {t('forgot.backToLogin')}
      </Link>
    </p>
  )

  if (sent) {
    return (
      <div className="space-y-6">
        <h1 className="text-center text-headline font-extrabold">
          {t('forgot.sentTitle')}
        </h1>
        <p
          role="status"
          className="rounded-md border border-success-border bg-success-subtle p-3 text-body text-success-emphasis"
        >
          {t('forgot.sent')}
        </p>
        <div className="space-y-3">
          <Button asChild size="lg" variant="inverse" className="w-full">
            <Link href={authHref('/auth/reset-password', returnTo)}>
              {t('forgot.haveToken')}
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setSent(false)}
          >
            {t('forgot.tryAgain')}
          </Button>
        </div>
        {backToLogin}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-headline font-extrabold">{t('forgot.title')}</h1>
        <p className="text-body text-muted-foreground">
          {t('forgot.description')}
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={submit}
          noValidate
          aria-busy={pending}
          className="space-y-5"
        >
          <fieldset disabled={pending} className="min-w-0">
            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('fields.email')}</FormLabel>
                  <AuthFormControl serverError={false}>
                    <Input
                      {...field}
                      type="email"
                      dir="ltr"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      aria-invalid={fieldState.invalid}
                    />
                  </AuthFormControl>
                  <FormDescription>{t('emailHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </fieldset>
          {!pending && <AuthFeedback state={hookFeedback(mutation.error)} />}
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
            {t(pending ? 'forgot.pending' : 'forgot.submit')}
          </Button>
        </form>
      </Form>
      {backToLogin}
    </div>
  )
}
