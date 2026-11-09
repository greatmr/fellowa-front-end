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
import { useUpdatePageNameMutation } from '@/features/settings/api/settings-hooks'
import {
  PAGE_NAME_MAX,
  PAGE_NAME_MIN,
  createPageNameSchema,
  normalizePageName,
} from '@/features/settings/schemas/settings'

type PageNameValues = { pageName: string }

/**
 * The page's public name (FQ-17, BE-USER-07; presentation `SettingsView`
 * "name or display name" field @ fdb5f6c, whose name is the one shown at the
 * top of the page). Saving it empty clears it, and the page shows `@alias`.
 */
export function PageNameForm({
  viewerId,
  initial,
}: {
  viewerId: number
  initial: string | null
}) {
  const t = useTranslations('settings')
  const mutation = useUpdatePageNameMutation(viewerId)
  const form = useForm<PageNameValues>({
    resolver: zodResolver(
      createPageNameSchema({
        length: t('validation.pageNameLength', {
          min: PAGE_NAME_MIN,
          max: PAGE_NAME_MAX,
        }),
      })
    ),
    defaultValues: { pageName: initial ?? '' },
  })

  const submit = form.handleSubmit(({ pageName }) => {
    mutation.mutate(normalizePageName(pageName), {
      onSuccess: (saved) => {
        form.reset({ pageName: saved ?? '' })
        toast.success(
          saved === null ? t('pageName.cleared') : t('pageName.saved')
        )
      },
      onError: (error) => {
        if (error.code === 'USER_ALIAS_REQUIRED') {
          form.setError('pageName', {
            message: t('validation.pageNameNeedsAddress'),
          })
          return
        }
        toast.error(
          error.status === 401 ? t('sessionExpired') : t('saveFailed')
        )
      },
    })
  })

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate aria-busy={mutation.isPending}>
        <fieldset disabled={mutation.isPending} className="grid min-w-0 gap-4">
          <FormField
            control={form.control}
            name="pageName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('pageName.label')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="off"
                    dir="auto"
                    placeholder={t('pageName.placeholder')}
                  />
                </FormControl>
                <FormDescription>
                  {t('pageName.hint', {
                    min: PAGE_NAME_MIN,
                    max: PAGE_NAME_MAX,
                  })}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <Button type="submit" disabled={!form.formState.isDirty}>
              {mutation.isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </fieldset>
      </form>
    </Form>
  )
}
