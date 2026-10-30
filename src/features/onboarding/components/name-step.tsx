'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm, useWatch } from 'react-hook-form'

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
import { useSaveNamesMutation } from '@/features/onboarding/api/onboarding-hooks'
import { StepError } from '@/features/onboarding/components/step-error'
import {
  FIRST_NAME_MIN,
  createNamesSchema,
} from '@/features/onboarding/schemas/onboarding'
import type { OnboardingNames } from '@/features/onboarding/types/onboarding'
import { FIRST_NAME_MAX, LAST_NAME_MAX } from '@/features/settings'

/**
 * The name step. The prototype asks for one "page name"; the backend has no
 * such field (BE-USER-02 leaves a public display name open), so this collects
 * the private first and last name, and says they stay private.
 */
export function NameStep({
  viewerId,
  initial,
  onSaved,
}: {
  viewerId: number
  initial: OnboardingNames
  onSaved: (names: OnboardingNames) => void
}) {
  const t = useTranslations('onboarding')
  const mutation = useSaveNamesMutation(viewerId)
  const form = useForm<OnboardingNames>({
    resolver: zodResolver(
      createNamesSchema({
        firstNameLength: t('name.validation.firstNameLength', {
          min: FIRST_NAME_MIN,
          max: FIRST_NAME_MAX,
        }),
        lastNameLength: t('name.validation.lastNameLength', {
          max: LAST_NAME_MAX,
        }),
      })
    ),
    mode: 'onTouched',
    defaultValues: initial,
  })

  const firstName = useWatch({ control: form.control, name: 'firstName' })

  const submit = form.handleSubmit((values) => {
    mutation.mutate(values, { onSuccess: onSaved })
  })

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-title font-bold text-foreground">
          {t('name.title')}
        </h1>
        <p className="text-body leading-7 text-muted-foreground">
          {t('name.description')}
        </p>
      </div>
      {mutation.error ? <StepError error={mutation.error} /> : null}
      <Form {...form}>
        <form onSubmit={submit} noValidate aria-busy={mutation.isPending}>
          <fieldset
            disabled={mutation.isPending}
            className="grid min-w-0 gap-4"
          >
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name.firstName')}</FormLabel>
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
                  <FormLabel>{t('name.lastName')}</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="family-name" dir="auto" />
                  </FormControl>
                  <FormDescription>{t('name.lastNameHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!firstName.trim()}
            >
              {mutation.isPending ? t('saving') : t('continue')}
            </Button>
          </fieldset>
        </form>
      </Form>
    </div>
  )
}
