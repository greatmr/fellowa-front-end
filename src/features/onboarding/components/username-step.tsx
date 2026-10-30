'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import type { FormEvent } from 'react'
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
import {
  ALIAS_MAX_LENGTH,
  ALIAS_MIN_LENGTH,
  createAliasSchema,
  normalizeAlias,
  useSetAliasMutation,
} from '@/features/auth'
import { StepError } from '@/features/onboarding/components/step-error'

/**
 * The username step, from the prototype's URL screen. Public routes use the
 * numeric id (C-9), so there is no `fellowa.ir/` prefix, no address preview and
 * no talk of a URL. There is no availability endpoint: "taken" is the server's
 * answer on submit, and the prototype's live check and suggestions are gone.
 */
export function UsernameStep({
  initial,
  onSaved,
  onBack,
}: {
  initial: string | null
  onSaved: (alias: string) => void
  onBack: () => void
}) {
  const t = useTranslations('onboarding')
  const mutation = useSetAliasMutation()
  const schema = createAliasSchema({
    tooShort: t('username.validation.tooShort', { min: ALIAS_MIN_LENGTH }),
    tooLong: t('username.validation.tooLong', { max: ALIAS_MAX_LENGTH }),
    chars: t('username.validation.chars'),
  })
  const form = useForm<{ alias: string }>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { alias: initial ?? '' },
  })

  const alias = useWatch({ control: form.control, name: 'alias' })
  const stored = normalizeAlias(alias)
  const showsStoredForm =
    stored !== alias.trim() && schema.safeParse({ alias }).success

  const validated = form.handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: () => onSaved(normalizeAlias(values.alias)),
      onError: (error) => {
        if (error.code === 'AUTH_ALIAS_TAKEN') {
          form.setError('alias', { message: t('username.taken') })
        } else if (error.status === 400) {
          form.setError('alias', { message: t('username.rejected') })
        }
      },
    })
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    // An unchanged username needs no save, and a legacy value from before the
    // current rules must not hold its owner on this screen.
    if (initial !== null && alias === initial) {
      event.preventDefault()
      onSaved(initial)
      return
    }
    void validated(event)
  }

  const handledInField =
    mutation.error?.code === 'AUTH_ALIAS_TAKEN' ||
    mutation.error?.status === 400

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-title font-bold text-foreground">
          {t('username.title')}
        </h1>
        <p className="text-body leading-7 text-muted-foreground">
          {t('username.description')}
        </p>
      </div>
      {mutation.error && !handledInField ? (
        <StepError error={mutation.error} />
      ) : null}
      <Form {...form}>
        <form onSubmit={submit} noValidate aria-busy={mutation.isPending}>
          <fieldset
            disabled={mutation.isPending}
            className="grid min-w-0 gap-4"
          >
            <FormField
              control={form.control}
              name="alias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('username.label')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      dir="ltr"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={t('username.placeholder')}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('username.hint', {
                      min: ALIAS_MIN_LENGTH,
                      max: ALIAS_MAX_LENGTH,
                    })}
                  </FormDescription>
                  {showsStoredForm ? (
                    <p className="text-body-sm text-foreground">
                      {t.rich('username.storedAs', {
                        alias: stored,
                        handle: (chunks) => (
                          <bdi dir="ltr" className="font-semibold">
                            {chunks}
                          </bdi>
                        ),
                      })}
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!alias.trim()}
            >
              {mutation.isPending ? t('saving') : t('continue')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="justify-self-center"
              onClick={onBack}
            >
              {t('back')}
            </Button>
          </fieldset>
        </form>
      </Form>
    </div>
  )
}
