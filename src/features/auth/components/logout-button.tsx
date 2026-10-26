'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { useLogoutMutation } from '@/features/auth/api/auth-hooks'
import { hookFeedback } from '@/features/auth/lib/hook-feedback'
import { useRouter } from '@/i18n/navigation'

import { AuthFeedback } from './auth-feedback'

export function LogoutButton() {
  const t = useTranslations('auth.nav')
  const router = useRouter()
  const submitting = useRef(false)
  const logout = useLogoutMutation()

  function submit() {
    if (submitting.current || logout.isPending) return
    submitting.current = true
    logout.mutate(undefined, {
      onSuccess: () => {
        logout.reset()
        router.replace('/auth/login')
      },
      onError: () => {
        submitting.current = false
      },
    })
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={logout.isPending}
        onClick={submit}
      >
        {t(logout.isPending ? 'loggingOut' : 'logout')}
      </Button>
      <AuthFeedback state={hookFeedback(logout.error)} />
    </div>
  )
}
