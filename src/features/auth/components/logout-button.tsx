'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { useLogoutMutation } from '@/features/auth/api/auth-hooks'
import { hookFeedback } from '@/features/auth/lib/hook-feedback'
import { useRouter } from '@/i18n/navigation'
import type { ApiError } from '@/lib/api/errors'

import { AuthFeedback } from './auth-feedback'

/**
 * Sign out once, then go to `/auth`. Shared by the logout button and the
 * studio account menu; a second call while one is in flight is ignored.
 */
export function useLogout() {
  const router = useRouter()
  const submitting = useRef(false)
  const logout = useLogoutMutation()

  function submit(onError?: (error: ApiError) => void) {
    if (submitting.current || logout.isPending) return
    submitting.current = true
    logout.mutate(undefined, {
      onSuccess: () => {
        logout.reset()
        router.replace('/auth')
      },
      onError: (error) => {
        submitting.current = false
        onError?.(error)
      },
    })
  }

  return { submit, isPending: logout.isPending, error: logout.error }
}

export function LogoutButton() {
  const t = useTranslations('auth.nav')
  const logout = useLogout()

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={logout.isPending}
        onClick={() => logout.submit()}
      >
        {t(logout.isPending ? 'loggingOut' : 'logout')}
      </Button>
      <AuthFeedback state={hookFeedback(logout.error)} />
    </div>
  )
}
