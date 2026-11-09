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
import { useSetFirstPasswordMutation } from '@/features/settings/api/settings-hooks'
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  createFirstPasswordSchema,
} from '@/features/settings/schemas/settings'
import { useRouter } from '@/i18n/navigation'

type FirstPasswordValues = { newPassword: string; confirmPassword: string }

const EMPTY: FirstPasswordValues = { newPassword: '', confirmPassword: '' }

/**
 * A first password for an account made by phone or Google (FE-AUTH-05; the
 * prototype's account step promises "you can set a password later in
 * settings"). No current password: there is none. Once set, or when the
 * backend says one already exists, the page is read again and shows the
 * change-password form instead.
 */
export function FirstPasswordForm({
  viewerId,
  email,
}: {
  viewerId: number
  /** Lets a password manager link the new password to this account. */
  email: string | null
}) {
  const t = useTranslations('settings')
  const router = useRouter()
  const mutation = useSetFirstPasswordMutation(viewerId)
  const form = useForm<FirstPasswordValues>({
    resolver: zodResolver(
      createFirstPasswordSchema({
        newLength: t('validation.newLength', { min: PASSWORD_MIN }),
        tooLong: t('validation.passwordTooLong', { max: PASSWORD_MAX }),
        mismatch: t('validation.mismatch'),
      })
    ),
    defaultValues: EMPTY,
  })

  const submit = form.handleSubmit(({ newPassword }) => {
    mutation.mutate(newPassword, {
      onSuccess: () => {
        form.reset(EMPTY)
        toast.success(t('firstPassword.set'))
        router.refresh()
      },
      onError: (error) => {
        if (error.code === 'AUTH_PASSWORD_ALREADY_SET') {
          form.reset(EMPTY)
          toast.error(t('firstPassword.alreadySet'))
          router.refresh()
          return
        }
        toast.error(
          error.status === 401 ? t('sessionExpired') : t('saveFailed')
        )
      },
    })
  })

  const fields = [
    { name: 'newPassword', label: 'firstPassword.newPassword' },
    { name: 'confirmPassword', label: 'firstPassword.confirmPassword' },
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
            value={email ?? ''}
            readOnly
            hidden
          />
          {fields.map(({ name, label }) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(label)}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="new-password"
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
              {mutation.isPending ? t('saving') : t('firstPassword.submit')}
            </Button>
          </div>
        </fieldset>
      </form>
    </Form>
  )
}
