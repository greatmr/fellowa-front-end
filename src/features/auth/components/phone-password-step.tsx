'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircleIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, useState, type FormEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  usePhoneLoginMutation,
  useRequestPhoneCodeMutation,
} from '@/features/auth/api/auth-hooks'
import type { Deadline } from '@/features/auth/lib/phone'
import type { PhoneCodeSent, PhoneSignIn } from '@/features/auth/types'

import { PasswordInput } from './password-input'
import { PhoneFeedback, PhoneNumber } from './phone-ui'

/**
 * Step 2b (presentation `PhonePasswordLoginScreen` @ fdb5f6c): a returning
 * account that has set a password. Asking for a code instead reuses the one
 * `request-code` already sent while its resend wait is running, and asks for
 * a new one after it.
 */
export function PhonePasswordStep({
  phone,
  wait,
  onSignedIn,
  onUseCode,
  onChangePhone,
}: {
  phone: string
  wait: Deadline
  onSignedIn: (result: PhoneSignIn) => void
  onUseCode: (sent?: PhoneCodeSent) => void
  onChangePhone: () => void
}) {
  const t = useTranslations('auth.phone')
  const submitting = useRef(false)
  const login = usePhoneLoginMutation()
  const request = useRequestPhoneCodeMutation()
  const [lastAction, setLastAction] = useState<'login' | 'code' | null>(null)
  const pending = login.isPending || request.isPending
  const form = useForm({
    resolver: zodResolver(
      z.object({
        password: z.string().min(1, t('validation.passwordRequired')),
      })
    ),
    defaultValues: { password: '' },
  })
  const password = useWatch({ control: form.control, name: 'password' })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || pending) return
    submitting.current = true
    setLastAction('login')
    request.reset()
    void form.handleSubmit(
      (values) =>
        login.mutate(
          { phone, password: values.password },
          {
            onSuccess: (result) => onSignedIn(result),
            onError: () => {
              submitting.current = false
            },
          }
        ),
      () => {
        submitting.current = false
      }
    )(event)
  }

  function switchToCode() {
    if (pending) return
    if (Date.now() < wait.until) {
      onUseCode()
      return
    }
    setLastAction('code')
    login.reset()
    request.mutate({ phone }, { onSuccess: (sent) => onUseCode(sent) })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-headline font-bold">{t('password.title')}</h1>
        <p className="text-body text-muted-foreground">
          {t.rich('password.description', {
            phone: () => <PhoneNumber phone={phone} />,
          })}
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={submit}
          noValidate
          aria-busy={login.isPending}
          className="space-y-4"
        >
          {/* For password managers: the account this password belongs to. */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={phone}
            readOnly
            hidden
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-3">
                  <FormLabel>{t('password.label')}</FormLabel>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-label"
                    onClick={switchToCode}
                    disabled={pending}
                  >
                    {t('password.useCode')}
                  </Button>
                </div>
                <PasswordInput
                  {...field}
                  onChange={(event) => {
                    field.onChange(event)
                    if (login.error) login.reset()
                  }}
                  autoComplete="current-password"
                  autoFocus
                  placeholder={t('password.placeholder')}
                  readOnly={pending}
                  aria-invalid={fieldState.invalid}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          {!pending && (
            <PhoneFeedback
              error={lastAction === 'code' ? request.error : login.error}
            />
          )}
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full"
            disabled={!password || pending}
          >
            {login.isPending && (
              <LoaderCircleIcon
                className="animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            )}
            {t(login.isPending ? 'password.pending' : 'password.submit')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={switchToCode}
            disabled={pending}
          >
            {t(
              request.isPending ? 'password.sendingCode' : 'password.sendCode'
            )}
          </Button>
        </form>
      </Form>
      <div className="text-center">
        <Button
          type="button"
          variant="ghost"
          onClick={onChangePhone}
          disabled={pending}
        >
          {t('password.changeNumber')}
        </Button>
      </div>
    </div>
  )
}
