'use client'

import { CheckIcon, LoaderCircleIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  useInterestsQuery,
  useSaveInterestsMutation,
} from '@/features/auth/api/auth-hooks'
import { SIGN_UP_STEPS } from '@/features/auth/lib/auth-steps'
import { sessionLost } from '@/features/auth/lib/hook-feedback'
import type { AuthHref } from '@/features/auth/lib/return-to'
import { useExploreCategoriesQuery } from '@/features/explore'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

import { AuthErrorLine } from './auth-error-line'
import { useAuthFlow } from './auth-flow-context'
import { AuthScreenHeading, AuthStepIndicator } from './auth-heading'
import { CategoryListFailed, CategoryListLoading } from './category-list-states'
import { PhoneFeedback } from './phone-ui'

const NO_PICKS: readonly number[] = []
const STALE_LIST = 'USER_CATEGORY_NOT_FOUND'

/**
 * Step 3 of 4 of sign-up (presentation `InterestsScreen` @ dc8467f,
 * FE-AUTH-08): the categories the account likes. The chips are the public
 * category list (`GET /landing/categories`, in its order), ticked from what
 * the account saved before (`GET /user/interests`); Continue replaces that set
 * (`PUT /user/interests`, BE-USER-08) and skip leaves it alone. Both go on to
 * the page's category (FQ-23). Sign-up never stops here: skip stays available
 * whatever fails. Not ported: the prototype's page creation with these topics;
 * the page was created on the address step.
 */
export function InterestsForm({
  viewerId,
  next,
}: {
  /** The signed-in account, for its per-account cache entry. */
  viewerId: number
  /** The next step, saved or skipped. */
  next: AuthHref
}) {
  const t = useTranslations('auth.interests')
  const listT = useTranslations('auth.categoryList')
  const toastT = useTranslations('auth.phone.toast')
  const router = useRouter()
  const { setPickedCategoryIds } = useAuthFlow()
  const categories = useExploreCategoriesQuery()
  const saved = useInterestsQuery(viewerId)
  const save = useSaveInterestsMutation(viewerId)
  const submitting = useRef(false)
  // What the account ticked here; until it touches a chip, its saved set.
  const [draft, setDraft] = useState<readonly number[] | null>(null)
  const picked = draft ?? saved.data ?? NO_PICKS

  const list = categories.data ?? []
  // Only ids the list shows are sent, in its order.
  const pickedIds = list
    .filter((category) => picked.includes(category.id))
    .map((category) => category.id)
  const listFailed =
    categories.isError || (categories.isSuccess && list.length === 0)
  const loading = !listFailed && (categories.isPending || saved.isPending)
  const pending = save.isPending
  const lost = sessionLost(saved.error) || sessionLost(save.error)

  // The visual column re-orders its sample creators by these.
  useEffect(() => {
    setPickedCategoryIds(picked)
  }, [picked, setPickedCategoryIds])

  useEffect(() => {
    if (lost) {
      router.replace({ pathname: '/auth', query: { reason: 'expired' } })
    }
  }, [lost, router])

  function toggle(id: number) {
    if (pending) return
    if (save.error) save.reset()
    setDraft((current) => {
      const base = current ?? saved.data ?? NO_PICKS
      return base.includes(id)
        ? base.filter((other) => other !== id)
        : [...base, id]
    })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || pending || pickedIds.length === 0) return
    submitting.current = true
    save.mutate(
      { categoryIds: pickedIds },
      {
        onSuccess: () => {
          toast.success(toastT('interestsSaved'))
          router.replace(next)
        },
        onError: (error) => {
          submitting.current = false
          // A category this list still showed is gone: show the list again.
          if (error.code === STALE_LIST) void categories.refetch()
        },
      }
    )
  }

  function skip() {
    if (submitting.current || pending) return
    router.replace(next)
  }

  return (
    <div className="w-full">
      <AuthStepIndicator current={3} total={SIGN_UP_STEPS} />
      <AuthScreenHeading
        tone="inverse"
        title={t('title')}
        description={t('description')}
        className="mb-6"
      />
      <form
        onSubmit={submit}
        noValidate
        aria-busy={pending}
        className="space-y-4"
      >
        {loading ? (
          <CategoryListLoading className="justify-center" />
        ) : listFailed ? (
          <CategoryListFailed
            retrying={categories.isFetching}
            onRetry={() => void categories.refetch()}
          />
        ) : (
          <div
            role="group"
            aria-label={t('topics')}
            className="flex flex-wrap justify-center gap-2.5"
          >
            {list.map((category) => {
              const selected = picked.includes(category.id)
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={selected}
                  aria-disabled={pending || undefined}
                  onClick={() => toggle(category.id)}
                  className={cn(
                    'flex h-10 items-center gap-1.5 rounded-full px-4 text-body-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    selected
                      ? 'bg-inverse text-inverse-foreground shadow-xs'
                      : 'border border-input text-ink-650 hover:border-foreground hover:text-foreground dark:text-ink-200'
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

        <p className="pt-1 text-center text-label font-medium text-muted-foreground">
          {t('helper')}
        </p>

        {!pending && save.error && !lost ? (
          save.error.code === STALE_LIST ? (
            <AuthErrorLine role="alert" centered>
              {listT('stale')}
            </AuthErrorLine>
          ) : (
            <PhoneFeedback error={save.error} centered />
          )
        ) : null}

        <div className="pt-4">
          <Button
            type="submit"
            variant="inverse"
            size="lg"
            className="h-12 w-full rounded-xl"
            disabled={pickedIds.length === 0 || pending}
          >
            {pending && (
              <LoaderCircleIcon
                className="animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            )}
            {t(pending ? 'pending' : 'submit')}
          </Button>
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={skip}
            disabled={pending}
            className="rounded-sm text-body font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {t('skip')}
          </button>
        </div>
      </form>
    </div>
  )
}
