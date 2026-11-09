'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircleIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, type FormEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

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
import { SIGN_UP_STEPS } from '@/features/auth/lib/auth-steps'
import type { AuthHref } from '@/features/auth/lib/return-to'
import type { CompleteAccountPayload } from '@/features/auth/types'
import { useRouter } from '@/i18n/navigation'

import { AuthFormControl } from './auth-form-control'
import { PasswordInput } from './password-input'
import { useAuthFlow } from './auth-flow-context'
import { AuthScreenHeading, AuthStepIndicator } from './auth-heading'
import { PhoneFeedback, PhoneNumber } from './phone-ui'

/**
 * Step 1 of 2 (presentation `CompleteAccountScreen` @ fdb5f6c): a display name
 * and, optionally, a first password (`PUT /auth/account`). The name is also
 * the page's public name (FQ-17, BE-USER-07). "Skip" still sends the name; it
 * only leaves the password out. Then the page address step, or straight back
 * to the page the account started from (FQ-17). Not ported: the bottom "back
 * to the previous step" link; the account is signed in by now, and the
 * header's back button covers it.
 */
export function CompleteAccountForm({
  next,
  firstOfSteps,
}: {
  /** Where the account goes after this step (`afterAccountDestination`). */
  next: AuthHref
  /** The address step follows: show "step 1 of 2". */
  firstOfSteps: boolean
}) {
  const t = useTranslations('auth.phone')
  const router = useRouter()
  const { signedInPhone, setPageName } = useAuthFlow()
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
      onSuccess: () => {
        setPageName(payload.displayName)
        toast.success(t(payload.password ? 'toast.saved' : 'toast.skipped'))
        router.replace(next)
      },
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
    <div className="w-full">
      {firstOfSteps ? (
        <AuthStepIndicator current={1} total={SIGN_UP_STEPS} />
      ) : null}
      <AuthScreenHeading
        title={t('account.title')}
        description={
          signedInPhone
            ? t.rich('account.phoneLine', {
                phone: () => <PhoneNumber phone={signedInPhone} />,
              })
            : t('account.description')
        }
        className="mb-6"
      />
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
