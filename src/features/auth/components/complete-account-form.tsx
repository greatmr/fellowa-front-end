'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircleIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, type FormEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'

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
import { useCompleteAccountMutation } from '@/features/auth/api/auth-hooks'
import {
  createCompleteAccountSchema,
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  PASSWORD_MIN,
} from '@/features/auth/schemas'
import type { CompleteAccountPayload } from '@/features/auth/types'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

import { AuthFormControl } from './auth-form-control'
import { PasswordInput } from './password-input'
import { PhoneFeedback } from './phone-ui'

/** This step, then the onboarding's username and socials steps. */
const STEP = 1
const STEPS = 3

/** Where the account goes next: the onboarding, at its username step. */
export const AFTER_ACCOUNT = {
  pathname: '/onboarding',
  query: { step: 'username' },
} as const

/**
 * Step 3 (presentation `CompleteAccountScreen` @ fdb5f6c): a display name
 * and, optionally, a first password (`PUT /auth/account`). "Skip" still sends
 * the name; it only leaves the password out. Not ported: "back to the previous
 * step" (the account is already signed in) and the phone line (the number is
 * not in the session; the prototype's own fallback line is shown).
 */
export function CompleteAccountForm() {
  const t = useTranslations('auth.phone')
  const router = useRouter()
  const submitting = useRef(false)
  const mutation = useCompleteAccountMutation()
  const pending = mutation.isPending
  const form = useForm({
    resolver: zodResolver(
      createCompleteAccountSchema({
        displayNameLength: t('validation.displayNameLength', {
          min: DISPLAY_NAME_MIN,
          max: DISPLAY_NAME_MAX,
        }),
        passwordLength: t('validation.passwordLength', { min: PASSWORD_MIN }),
      })
    ),
    defaultValues: { displayName: '', password: '' },
  })
  const name = useWatch({ control: form.control, name: 'displayName' })
  const canSubmit = name.trim().length >= DISPLAY_NAME_MIN

  function save(payload: CompleteAccountPayload) {
    mutation.mutate(payload, {
      onSuccess: () => router.replace(AFTER_ACCOUNT),
      onError: () => {
        submitting.current = false
      },
    })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || pending) return
    submitting.current = true
    void form.handleSubmit(
      ({ displayName, password }) =>
        save(password ? { displayName, password } : { displayName }),
      () => {
        submitting.current = false
      }
    )(event)
  }

  async function skip() {
    if (submitting.current || pending) return
    submitting.current = true
    form.clearErrors('password')
    if (!(await form.trigger('displayName', { shouldFocus: true }))) {
      submitting.current = false
      return
    }
    save({ displayName: form.getValues('displayName').trim() })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-2">
        <p className="text-label font-semibold text-muted-foreground">
          {t('account.progress', { current: STEP, total: STEPS })}
        </p>
        <div
          role="progressbar"
          aria-label={t('account.progressLabel')}
          aria-valuemin={1}
          aria-valuemax={STEPS}
          aria-valuenow={STEP}
          className="flex w-full gap-1.5"
        >
          {Array.from({ length: STEPS }, (_, index) => (
            <div
              key={index}
              className={cn(
                'h-1 flex-1 rounded-full',
                index < STEP ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-headline font-bold">{t('account.title')}</h1>
        <p className="text-body text-muted-foreground">
          {t('account.description')}
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
            name="displayName"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{t('account.nameLabel')}</FormLabel>
                <AuthFormControl serverError={false}>
                  <Input
                    {...field}
                    type="text"
                    autoComplete="name"
                    autoFocus
                    maxLength={DISPLAY_NAME_MAX}
                    placeholder={t('account.namePlaceholder')}
                    readOnly={pending}
                    aria-invalid={fieldState.invalid}
                    className="h-12"
                  />
                </AuthFormControl>
                <FormDescription>{t('account.nameHint')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-3">
                  <FormLabel>
                    {t('account.passwordLabel')}{' '}
                    <span className="text-label font-normal text-muted-foreground">
                      {t('account.optional')}
                    </span>
                  </FormLabel>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-label"
                    onClick={skip}
                    disabled={pending}
                  >
                    {t('account.skipLink')}
                  </Button>
                </div>
                <PasswordInput
                  {...field}
                  value={field.value ?? ''}
                  autoComplete="new-password"
                  placeholder={t('account.passwordPlaceholder', {
                    min: PASSWORD_MIN,
                  })}
                  readOnly={pending}
                  aria-invalid={fieldState.invalid}
                />
                <FormDescription>{t('account.passwordHint')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {!pending && <PhoneFeedback error={mutation.error} guarded />}
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full"
            disabled={!canSubmit || pending}
          >
            {pending && (
              <LoaderCircleIcon
                className="animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            )}
            {t(pending ? 'account.pending' : 'account.submit')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={skip}
            disabled={!canSubmit || pending}
          >
            {t('account.skip')}
          </Button>
        </form>
      </Form>
    </div>
  )
}
