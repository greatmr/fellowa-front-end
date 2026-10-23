'use client'

import { useActionState, useEffect, useRef, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import type { AuthFormAction } from '@/features/auth/types'

import { AuthFeedback } from './auth-feedback'

export function LogoutButton({
  action,
  permalink,
}: {
  action: AuthFormAction
  permalink?: string
}) {
  const t = useTranslations('auth.nav')
  const submitting = useRef(false)
  const [state, dispatch, pending] = useActionState(
    action,
    { status: 'idle' },
    permalink
  )
  useEffect(() => {
    if (!pending) submitting.current = false
  }, [pending, state])
  const queryClient = useQueryClient()

  function submit(event: FormEvent<HTMLFormElement>) {
    if (submitting.current) {
      event.preventDefault()
      return
    }
    submitting.current = true
    queryClient.clear()
  }

  return (
    <form
      action={dispatch}
      onSubmit={submit}
      aria-busy={pending}
      className="space-y-2"
    >
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {t(pending ? 'loggingOut' : 'logout')}
      </Button>
      <AuthFeedback state={state} />
    </form>
  )
}
