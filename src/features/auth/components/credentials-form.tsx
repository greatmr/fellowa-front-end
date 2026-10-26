'use client'

import { useRef, useState, type FormEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { EyeIcon, EyeOffIcon, LoaderCircleIcon } from 'lucide-react'
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
import { safeReturnTo } from '@/features/auth/lib/return-to'
import { createCredentialsSchema } from '@/features/auth/schemas'
import { Link, useRouter } from '@/i18n/navigation'

import { AuthFeedback } from './auth-feedback'
import { AuthFormControl } from './auth-form-control'

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
  const [showPassword, setShowPassword] = useState(false)
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
  const href = returnTo
    ? { pathname: `/auth/${oppositeMode}`, query: { returnTo } }
    : `/auth/${oppositeMode}`
  const state = hookFeedback(mutation.error)

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-headline font-extrabold">{t(`${mode}.title`)}</h1>
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
                  <div className="relative" dir="ltr">
                    <AuthFormControl serverError={false}>
                      <Input
                        {...field}
                        className="pe-12"
                        type={showPassword ? 'text' : 'password'}
                        dir="ltr"
                        autoComplete={
                          mode === 'login' ? 'current-password' : 'new-password'
                        }
                        required
                        minLength={mode === 'register' ? 8 : undefined}
                        aria-invalid={fieldState.invalid}
                      />
                    </AuthFormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute inset-y-0 end-0.5 my-auto"
                      aria-label={t(
                        showPassword ? 'password.hide' : 'password.show'
                      )}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? (
                        <EyeOffIcon aria-hidden />
                      ) : (
                        <EyeIcon aria-hidden />
                      )}
                    </Button>
                  </div>
                  <FormDescription>
                    {t(
                      mode === 'register'
                        ? 'password.hint'
                        : 'password.loginHint'
                    )}
                  </FormDescription>
                  <FormMessage />
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
