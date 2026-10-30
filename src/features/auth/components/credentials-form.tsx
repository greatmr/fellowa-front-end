'use client'

import { useRef, type FormEvent } from 'react'
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
  useLoginMutation,
  useRegisterMutation,
} from '@/features/auth/api/auth-hooks'
import { hookFeedback } from '@/features/auth/lib/hook-feedback'
import { authHref, safeReturnTo } from '@/features/auth/lib/return-to'
import { createCredentialsSchema } from '@/features/auth/schemas'
import { Link, useRouter } from '@/i18n/navigation'

import { AuthFeedback } from './auth-feedback'
import { AuthFormControl } from './auth-form-control'
import { PasswordInput } from './password-input'

export function CredentialsForm({
  mode,
  returnTo,
}: {
  mode: 'login' | 'register'
  returnTo?: string
}) {
  const t = useTranslations('auth')
  const router = useRouter()
  const submitting = useRef(false)
  const login = useLoginMutation()
  const register = useRegisterMutation()
  const mutation = mode === 'login' ? login : register
  const pending = mutation.isPending
  const form = useForm<{ email: string; password: string }>({
    resolver: zodResolver(
      createCredentialsSchema(mode, {
        email: t('validation.email'),
        passwordRequired: t('validation.passwordRequired'),
        passwordLength: t('validation.passwordLength'),
        code: t('validation.code'),
      })
    ),
    defaultValues: { email: '', password: '' },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || pending) return
    submitting.current = true
    void form.handleSubmit(
      (values) => {
        mutation.mutate(values, {
          onSuccess: (user) => {
            mutation.reset()
            const destination = safeReturnTo(returnTo)
            router.replace(
              user.isVerified
                ? destination
                : {
                    pathname: '/auth/verify-email',
                    query: { returnTo: destination },
                  }
            )
          },
          onError: () => {
            submitting.current = false
          },
        })
      },
      () => {
        submitting.current = false
      }
    )(event)
  }

  const oppositeMode = mode === 'login' ? 'register' : 'login'
  const href = authHref(`/auth/${oppositeMode}`, returnTo)
  const state = hookFeedback(mutation.error)

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-headline font-bold">{t(`${mode}.title`)}</h1>
        <p className="text-body text-muted-foreground">
          {t(`${mode}.description`)}
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
            <FormField
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('fields.password')}</FormLabel>
                  <PasswordInput
                    {...field}
                    autoComplete={
                      mode === 'login' ? 'current-password' : 'new-password'
                    }
                    required
                    minLength={mode === 'register' ? 8 : undefined}
                    aria-invalid={fieldState.invalid}
                  />
                  <FormDescription>
                    {t(
                      mode === 'register'
                        ? 'password.hint'
                        : 'password.loginHint'
                    )}
                  </FormDescription>
                  <FormMessage />
                  {mode === 'login' && (
                    <Link
                      href={authHref('/auth/forgot-password', returnTo)}
                      className="justify-self-end rounded-sm text-body-sm font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {t('login.forgotLink')}
                    </Link>
                  )}
                </FormItem>
              )}
            />
          </fieldset>
          {!pending && <AuthFeedback state={state} returnTo={returnTo} />}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            variant="inverse"
            disabled={pending}
          >
            {pending && (
              <LoaderCircleIcon
                className="animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            )}
            {t(`${mode}.${pending ? 'pending' : 'submit'}`)}
          </Button>
        </form>
      </Form>
      <p className="text-center text-body text-muted-foreground">
        {t(`${mode}.switchPrompt`)}{' '}
        <Link
          href={href}
          className="rounded-sm font-semibold text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {t(`${mode}.switchLink`)}
        </Link>
      </p>
    </div>
  )
}
