'use client'

import { CheckIcon, LoaderCircleIcon } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useSetPageCategoryMutation } from '@/features/auth/api/auth-hooks'
import {
  useReleaseWhenHidden,
  useStepNavigation,
} from '@/features/auth/hooks/use-step-navigation'
import {
  PAGE_ADDRESS_PATH,
  SIGN_UP_STEPS,
} from '@/features/auth/lib/auth-steps'
import { sessionLost } from '@/features/auth/lib/hook-feedback'
import { authHref } from '@/features/auth/lib/return-to'
import { useExploreCategoriesQuery } from '@/features/explore'
import { getDirection } from '@/i18n/routing'
import { cn } from '@/lib/utils'

import { AuthErrorLine } from './auth-error-line'
import { AuthStepIndicator } from './auth-heading'
import { CategoryListFailed, CategoryListLoading } from './category-list-states'
import { PhoneFeedback } from './phone-ui'

const STALE_LIST = 'USER_CATEGORY_NOT_FOUND'
const NO_PAGE = 'USER_ALIAS_REQUIRED'

/**
 * Step 4 of 4 of sign-up (presentation `OnboardingTopicsScreen` @ 01fb04d;
 * FE-AUTH-08, the owner's answer to FQ-23): the page's one category, as
 * `creator_page.category_id` is one. The chips are the public category list
 * (`GET /landing/categories`, shared with the interests step) and behave as a
 * radio group: a pick replaces the last. It starts from the page's category
 * (`categoryId` of the owner profile) and saves with `PUT /user/category`;
 * skip saves nothing. Not ported: the design's second pick ("up to two") and
 * its "other" chip, which is no category the API knows.
 */
export function PageCategoryForm({
  viewerId,
  currentCategoryId,
  destination,
  returnTo,
}: {
  /** The signed-in account the step rendered for. */
  viewerId: number
  /** The page's category now, `null` for none. */
  currentCategoryId: number | null
  /** Where sign-up ends, saved or skipped. */
  destination: string
  returnTo?: string
}) {
  const t = useTranslations('auth.pageCategory')
  const listT = useTranslations('auth.categoryList')
  const toastT = useTranslations('auth.phone.toast')
  const { navigating, replace } = useStepNavigation()
  const direction = getDirection(useLocale())
  const categories = useExploreCategoriesQuery()
  const save = useSetPageCategoryMutation(viewerId)
  const submitting = useRef(false)
  useReleaseWhenHidden(submitting)
  const [skipped, setSkipped] = useState(false)
  const chips = useRef<Array<HTMLButtonElement | null>>([])
  // The account's pick here; until it makes one, the page's category.
  const [draft, setDraft] = useState<number | null>(null)

  const list = categories.data ?? []
  // Only a category the list shows can be picked or sent.
  const picked =
    list.find((category) => category.id === (draft ?? currentCategoryId)) ??
    null
  const listFailed =
    categories.isError || (categories.isSuccess && list.length === 0)
  // Saving, then moving on: pending until the next page has rendered.
  const pending = save.isPending || navigating
  const saving = save.isPending || (navigating && !skipped)
  const handledElsewhere =
    sessionLost(save.error) || save.error?.code === NO_PAGE

  function choose(index: number) {
    const category = list[index]
    if (!category || pending) return
    if (save.error) save.reset()
    setDraft(category.id)
  }

  // Radio-group keys (as `ThemeSwitch`): arrows move and pick, following the
  // reading direction; Home and End go to the ends.
  function moveSelection(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    const nextKey = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const previousKey = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    let target: number
    if (event.key === 'Home') target = 0
    else if (event.key === 'End') target = list.length - 1
    else if (event.key === nextKey || event.key === 'ArrowDown') {
      target = (index + 1) % list.length
    } else if (event.key === previousKey || event.key === 'ArrowUp') {
      target = (index + list.length - 1) % list.length
    } else return

    event.preventDefault()
    choose(target)
    chips.current[target]?.focus()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || pending || !picked) return
    submitting.current = true
    // Back here with the category unchanged: nothing to save.
    if (picked.id === currentCategoryId) {
      replace(destination)
      return
    }
    save.mutate(
      { categoryId: picked.id },
      {
        onSuccess: () => {
          toast.success(toastT('saved'))
          replace(destination)
        },
        onError: (error) => {
          if (sessionLost(error)) {
            replace({ pathname: '/auth', query: { reason: 'expired' } })
            return
          }
          // No page to file: the address step creates one.
          if (error.code === NO_PAGE) {
            replace(authHref(PAGE_ADDRESS_PATH, returnTo))
            return
          }
          submitting.current = false
          // A category this list still showed is gone: show the list again.
          if (error.code === STALE_LIST) void categories.refetch()
        },
      }
    )
  }

  function skip() {
    if (submitting.current || pending) return
    submitting.current = true
    setSkipped(true)
    replace(destination)
  }

  return (
    <div className="w-full">
      <AuthStepIndicator current={4} total={SIGN_UP_STEPS} />
      <h1 className="mb-2.5 text-headline leading-tight font-bold text-foreground">
        {t('title')}
      </h1>
      <p className="mb-6 text-body-lg leading-relaxed text-muted-foreground">
        {t('description')}
      </p>
      <form
        onSubmit={submit}
        noValidate
        aria-busy={saving}
        className="space-y-4"
      >
        {categories.isPending ? (
          <CategoryListLoading />
        ) : listFailed ? (
          <CategoryListFailed
            retrying={categories.isFetching}
            onRetry={() => void categories.refetch()}
          />
        ) : (
          <div
            role="radiogroup"
            aria-label={t('options')}
            aria-orientation="horizontal"
            className="flex flex-wrap gap-2.5"
          >
            {list.map((category, index) => {
              const selected = picked?.id === category.id
              return (
                <button
                  key={category.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-disabled={pending || undefined}
                  tabIndex={selected || (!picked && index === 0) ? 0 : -1}
                  ref={(element) => {
                    chips.current[index] = element
                  }}
                  onKeyDown={(event) => moveSelection(event, index)}
                  onClick={() => choose(index)}
                  className={cn(
                    'flex h-10 items-center gap-1.5 rounded-full px-4 text-body-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    selected
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'border border-input text-ink-650 hover:border-primary hover:text-primary dark:text-ink-200'
                  )}
                >
                  {selected && (
                    <CheckIcon
                      className="size-4"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  )}
                  <span>{category.title}</span>
                </button>
              )
            })}
          </div>
        )}

        {picked ? (
          <p className="pt-1 text-label font-medium text-muted-foreground">
            {t('helper')}
          </p>
        ) : null}

        {!pending && save.error && !handledElsewhere ? (
          save.error.code === STALE_LIST ? (
            <AuthErrorLine role="alert">{listT('stale')}</AuthErrorLine>
          ) : (
            <PhoneFeedback error={save.error} />
          )
        ) : null}

        <div className="pt-6">
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-full"
            disabled={!picked || pending}
          >
            {saving && (
              <LoaderCircleIcon
                className="animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            )}
            {t(saving ? 'pending' : 'submit')}
          </Button>
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={skip}
            disabled={pending}
            aria-busy={(navigating && skipped) || undefined}
            className={cn(
              'rounded-sm text-body font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
              navigating &&
                skipped &&
                'animate-pulse motion-reduce:animate-none'
            )}
          >
            {t('skip')}
          </button>
        </div>
      </form>
    </div>
  )
}
