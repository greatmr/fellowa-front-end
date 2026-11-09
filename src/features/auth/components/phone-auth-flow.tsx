'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { toast } from 'sonner'

import type { GoogleErrorKind } from '@/features/auth/lib/google-error'
import { deadlineIn, type Deadline } from '@/features/auth/lib/phone'
import { authHref, phoneSignInDestination } from '@/features/auth/lib/return-to'
import type { PhoneCodeSent, PhoneSignIn } from '@/features/auth/types'
import { useRouter } from '@/i18n/navigation'

import { useAuthFlow } from './auth-flow-context'
import { PhoneCodeStep } from './phone-code-step'
import { PhoneEntryStep } from './phone-entry-step'
import { PhonePasswordStep } from './phone-password-step'

export type PhoneStep = 'entry' | 'otp' | 'password'

const PATHS = {
  entry: '/auth',
  otp: '/auth/otp',
  password: '/auth/password',
} as const satisfies Record<PhoneStep, string>

/**
 * Phone-first sign-in and sign-up (FE-AUTH-01, FQ-16; presentation
 * `AuthContainer` @ fdb5f6c), one route per step: `/auth`, `/auth/otp`,
 * `/auth/password`. The number and the resend wait live in the auth layout's
 * memory; the session is the httpOnly cookie the server actions set. A step
 * reached without a number (a reload, a shared link) goes back to `/auth`.
 */
export function PhoneAuthFlow({
  step,
  returnTo,
  google,
}: {
  step: PhoneStep
  returnTo?: string
  google?: { enabled: boolean; locale: string; error: GoogleErrorKind | null }
}) {
  const t = useTranslations('auth.phone.toast')
  const router = useRouter()
  const { target, setTarget, setSignedInPhone } = useAuthFlow()
  const missingTarget = step !== 'entry' && !target

  useEffect(() => {
    if (missingTarget) router.replace(authHref(PATHS.entry, returnTo))
  }, [missingTarget, returnTo, router])

  function go(next: PhoneStep) {
    router.push(authHref(PATHS[next], returnTo))
  }

  function codeSent(sent: PhoneCodeSent) {
    setTarget(() => ({
      phone: sent.phone,
      hasPassword: sent.hasPassword,
      wait: deadlineIn(sent.resendAfterSeconds),
    }))
    go(sent.hasPassword ? 'password' : 'otp')
  }

  function signedIn(result: PhoneSignIn) {
    const completing = result.isNewUser || result.needsProfile
    setSignedInPhone(completing ? result.phone : null)
    toast.success(t(result.isNewUser ? 'verified' : 'welcomeBack'))
    router.replace(phoneSignInDestination(result, returnTo))
  }

  function waitUntil(wait: Deadline) {
    setTarget((current) => current && { ...current, wait })
  }

  if (step === 'entry') {
    return (
      <PhoneEntryStep
        initialPhone={target?.phone}
        onResume={(phone) => {
          // The same number while its code is fresh: no new request (it would
          // be refused as rate-limited); go back to where it was.
          if (!target || target.phone !== phone) return false
          if (Date.now() >= target.wait.until) return false
          go(target.hasPassword ? 'password' : 'otp')
          return true
        }}
        returnTo={returnTo}
        google={google}
        onCodeSent={codeSent}
      />
    )
  }

  if (!target) return null

  if (step === 'password') {
    return (
      <PhonePasswordStep
        phone={target.phone}
        wait={target.wait}
        onSignedIn={signedIn}
        onUseCode={(sent) => {
          if (sent) waitUntil(deadlineIn(sent.resendAfterSeconds))
          go('otp')
        }}
        onChangePhone={() => go('entry')}
      />
    )
  }

  return (
    <PhoneCodeStep
      phone={target.phone}
      hasPassword={target.hasPassword}
      wait={target.wait}
      onResent={waitUntil}
      onSignedIn={signedIn}
      onEditPhone={() => go('entry')}
      onUsePassword={() => go('password')}
    />
  )
}
