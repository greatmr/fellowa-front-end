'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { useStepNavigation } from '@/features/auth/hooks/use-step-navigation'
import type { GoogleErrorKind } from '@/features/auth/lib/google-error'
import { deadlineIn, type Deadline } from '@/features/auth/lib/phone'
import { authHref, phoneSignInDestination } from '@/features/auth/lib/return-to'
import type {
  PhoneCodeSent,
  PhoneLookup,
  PhoneSignIn,
} from '@/features/auth/types'
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
  // Each step's buttons stay pending until the next route has rendered.
  const { navigating, push, replace } = useStepNavigation()
  const { target, setTarget, setSignedInPhone } = useAuthFlow()
  const missingTarget = step !== 'entry' && !target
  // The code step for a number that was only looked up (back/forward, a
  // typed URL) would claim an SMS that never went out.
  const noCode = step === 'otp' && target !== null && !target.codeSent

  useEffect(() => {
    if (missingTarget) router.replace(authHref(PATHS.entry, returnTo))
    else if (noCode) router.replace(authHref(PATHS.password, returnTo))
  }, [missingTarget, noCode, returnTo, router])

  function go(next: PhoneStep) {
    push(authHref(PATHS[next], returnTo))
  }

  function codeSent(sent: PhoneCodeSent) {
    setTarget(() => ({
      phone: sent.phone,
      hasPassword: sent.hasPassword,
      codeSent: true,
      wait: deadlineIn(sent.resendAfterSeconds),
    }))
    go(sent.hasPassword ? 'password' : 'otp')
  }

  /**
   * FE-AUTH-07: the lookup found a password, so no code was sent and no wait
   * runs (an already-ended deadline); "use a code" on the password step asks
   * for one.
   */
  function passwordFound(found: PhoneLookup) {
    setTarget(() => ({
      phone: found.phone,
      hasPassword: true,
      codeSent: false,
      wait: deadlineIn(0),
    }))
    go('password')
  }

  function signedIn(result: PhoneSignIn) {
    const completing = result.isNewUser || result.needsProfile
    setSignedInPhone(completing ? result.phone : null)
    toast.success(t(result.isNewUser ? 'verified' : 'welcomeBack'))
    replace(phoneSignInDestination(result, returnTo))
  }

  function waitUntil(wait: Deadline) {
    setTarget((current) => current && { ...current, codeSent: true, wait })
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
        navigating={navigating}
        onPasswordFound={passwordFound}
        onCodeSent={codeSent}
      />
    )
  }

  if (!target || noCode) return null

  if (step === 'password') {
    return (
      <PhonePasswordStep
        phone={target.phone}
        wait={target.wait}
        navigating={navigating}
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
      navigating={navigating}
      onResent={waitUntil}
      onSignedIn={signedIn}
      onEditPhone={() => go('entry')}
      onUsePassword={() => go('password')}
    />
  )
}
