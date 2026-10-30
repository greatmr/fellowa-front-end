'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useChangePasswordMutation } from '@/features/settings/api/settings-hooks'
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  createPasswordSchema,
} from '@/features/settings/schemas/settings'

type PasswordValues = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const EMPTY: PasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

/**
 * Change password. Unlike the prototype (which read the stored password back
 * and set a new one without asking), the backend needs the current password,
 * and nothing about the password is ever shown or kept client-side.
 */
export function PasswordForm({
  viewerId,
  email,
}: {
  viewerId: number
  /** Lets a password manager link the new password to this account. */
  email: string
}) {
  const t = useTranslations('settings')
  const mutation = useChangePasswordMutation(viewerId)
  const form = useForm<PasswordValues>({
    resolver: zodResolver(
      createPasswordSchema({
        currentRequired: t('validation.currentRequired'),
        newLength: t('validation.newLength', { min: PASSWORD_MIN }),
        tooLong: t('validation.passwordTooLong', { max: PASSWORD_MAX }),
        mismatch: t('validation.mismatch'),
      })
    ),
    defaultValues: EMPTY,
  })

  const submit = form.handleSubmit(({ currentPassword, newPassword }) => {
    mutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          form.reset(EMPTY)
          toast.success(t('password.changed'))
        },
        onError: (error) => {
          if (error.code === 'AUTH_WRONG_PASSWORD') {
            form.setError('currentPassword', {
              message: t('validation.wrongPassword'),
            })
            return
          }
          toast.error(
            error.status === 401 ? t('sessionExpired') : t('saveFailed')
          )
        },
      }
    )
  })

  const fields = [
    { name: 'currentPassword', autoComplete: 'current-password' },
    { name: 'newPassword', autoComplete: 'new-password' },
    { name: 'confirmPassword', autoComplete: 'new-password' },
  ] as const

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate aria-busy={mutation.isPending}>
        <fieldset disabled={mutation.isPending} className="grid min-w-0 gap-4">
          {/* Not shown: password managers expect a username beside a new password. */}
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            hidden
          />
          {fields.map(({ name, autoComplete }) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(`password.${name}`)}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete={autoComplete}
                      dir="ltr"
                    />
                  </FormControl>
                  {name === 'newPassword' ? (
                    <FormDescription>
                      {t('password.hint', { min: PASSWORD_MIN })}
                    </FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <div>
            <Button type="submit">
              {mutation.isPending ? t('saving') : t('password.submit')}
            </Button>
          </div>
        </fieldset>
      </form>
    </Form>
  )
}
