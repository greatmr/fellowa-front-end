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
import { useUpdatePersonalMutation } from '@/features/settings/api/settings-hooks'
import {
  FIRST_NAME_MAX,
  LAST_NAME_MAX,
  createPersonalSchema,
} from '@/features/settings/schemas/settings'
import type { PersonalDetails } from '@/features/settings/types/settings'

/** Private personal details (presentation `SettingsView` name/phone fields). */
export function PersonalForm({
  viewerId,
  initial,
}: {
  viewerId: number
  initial: PersonalDetails
}) {
  const t = useTranslations('settings')
  const mutation = useUpdatePersonalMutation(viewerId)
  const form = useForm<PersonalDetails>({
    resolver: zodResolver(
      createPersonalSchema({
        firstNameLength: t('validation.firstNameLength', {
          max: FIRST_NAME_MAX,
        }),
        lastNameLength: t('validation.lastNameLength', { max: LAST_NAME_MAX }),
        phone: t('validation.phone'),
      })
    ),
    defaultValues: initial,
  })

  const submit = form.handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: (saved) => {
        form.reset(saved)
        toast.success(t('personal.saved'))
      },
      onError: (error) => {
        toast.error(
          error.status === 401 ? t('sessionExpired') : t('saveFailed')
        )
      },
    })
  })

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate aria-busy={mutation.isPending}>
        <fieldset
          disabled={mutation.isPending}
          className="grid min-w-0 gap-4 sm:grid-cols-2"
        >
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('personal.firstName')}</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="given-name" dir="auto" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('personal.lastName')}</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="family-name" dir="auto" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t('personal.phone')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder={t('personal.phonePlaceholder')}
                  />
                </FormControl>
                <FormDescription>{t('personal.phoneHint')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={!form.formState.isDirty}>
              {mutation.isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </fieldset>
      </form>
    </Form>
  )
}
