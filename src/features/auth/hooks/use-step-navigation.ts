'use client'

import {
  useCallback,
  useLayoutEffect,
  useTransition,
  type RefObject,
} from 'react'

import { useRouter } from '@/i18n/navigation'

type Href = Parameters<ReturnType<typeof useRouter>['push']>[0]

/**
 * Moves from one auth step to the next inside a transition. The step routes
 * share the auth layout's Suspense boundary, which is already on screen, so
 * the current step stays visible until the next one has rendered — no
 * skeleton in between — and `navigating` stays true for that whole time: the
 * button that moved on keeps its loading state through the route change.
 */
export function useStepNavigation() {
  const router = useRouter()
  const [navigating, startTransition] = useTransition()

  const push = useCallback(
    (href: Href) => startTransition(() => router.push(href)),
    [router]
  )
  const replace = useCallback(
    (href: Href) => startTransition(() => router.replace(href)),
    [router]
  )

  return { navigating, push, replace }
}

/**
 * A step that moves on keeps its double-submit guard held: `navigating` only
 * renders a tick later. With Cache Components the step it leaves is hidden
 * (React `Activity`), not unmounted, and back/forward shows it again; this
 * lets go of the guard when it is hidden, so the step is usable on return.
 */
export function useReleaseWhenHidden(guard: RefObject<boolean>) {
  useLayoutEffect(
    () => () => {
      guard.current = false
    },
    [guard]
  )
}
