'use client'

import {
  startTransition,
  useActionState,
  useState,
  useRef,
  useEffect,
  type FormEvent,
} from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
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
import { createCredentialsSchema } from '@/features/auth/schemas'
import type { AuthActionState, AuthFormAction } from '@/features/auth/types'
import { Link } from '@/i18n/navigation'

import { AuthFeedback } from './auth-feedback'
import { AuthFormControl } from './auth-form-control'

export function CredentialsForm({
  mode,
  action,
  returnTo,
  permalink,
  initialState,
}: {
  mode: 'login' | 'register'
  action: AuthFormAction
  returnTo?: string
  permalink?: string
  initialState?: AuthActionState
}) {
  const t = useTranslations('auth')
  const submitting = useRef(false)
  const [state, dispatch, pending] = useActionState<AuthActionState, FormData>(
    action,
    initialState ?? { status: 'idle' },
    permalink
  )
  useEffect(() => {
    if (!pending) submitting.current = false
  }, [pending, state])
  const [showPassword, setShowPassword] = useState(false)
  const queryClient = useQueryClient()
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
    const element = event.currentTarget
    if (submitting.current) {
      event.preventDefault()
      return
    }
    submitting.current = true
    void form.handleSubmit(
      () => {
        const data = new FormData(element)
        queryClient.clear()
        startTransition(() => dispatch(data))
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
  const fieldErrors = state.status === 'error' ? state.fieldErrors : undefined

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
          action={dispatch}
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
                  <AuthFormControl serverError={Boolean(fieldErrors?.email)}>
                    <Input
                      {...field}
                      type="email"
                      dir="ltr"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      aria-invalid={
                        fieldState.invalid || Boolean(fieldErrors?.email)
                      }
                    />
                  </AuthFormControl>
                  <FormDescription>{t('emailHint')}</FormDescription>
                  <FormMessage>
                    {fieldErrors?.email
                      ? t(`validation.${fieldErrors.email}`)
                      : undefined}
                  </FormMessage>
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
                    <AuthFormControl
                      serverError={Boolean(fieldErrors?.password)}
                    >
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
                        aria-invalid={
                          fieldState.invalid || Boolean(fieldErrors?.password)
                        }
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
                  <FormMessage>
                    {fieldErrors?.password
                      ? t(`validation.${fieldErrors.password}`)
                      : undefined}
                  </FormMessage>
                </FormItem>
              )}
            />
          </fieldset>
          <AuthFeedback state={state} returnTo={returnTo} />
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
