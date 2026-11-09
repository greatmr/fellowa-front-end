'use client'

import { useState } from 'react'

import { deadlineIn, type Deadline } from '@/features/auth/lib/phone'
import { phoneSignInDestination } from '@/features/auth/lib/return-to'
import type { PhoneCodeSent, PhoneSignIn } from '@/features/auth/types'
import { useRouter } from '@/i18n/navigation'

import { PhoneCodeStep } from './phone-code-step'
import { PhoneEntryStep } from './phone-entry-step'
import { PhonePasswordStep } from './phone-password-step'

type Target = { phone: string; hasPassword: boolean; wait: Deadline }
type Step = 'phone' | 'code' | 'password'

/**
 * Phone-first sign-in and sign-up (FE-AUTH-01, FQ-16; presentation
 * `AuthContainer` @ fdb5f6c). The number and the resend wait live only in this
 * component; the session is the httpOnly cookie the server actions set.
 */
export function PhoneAuthFlow({ returnTo }: { returnTo?: string }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [target, setTarget] = useState<Target | null>(null)

  function codeSent(sent: PhoneCodeSent) {
    setTarget({
      phone: sent.phone,
      hasPassword: sent.hasPassword,
      wait: deadlineIn(sent.resendAfterSeconds),
    })
    setStep(sent.hasPassword ? 'password' : 'code')
  }

  function signedIn(result: PhoneSignIn) {
    router.replace(phoneSignInDestination(result, returnTo))
  }

  function waitUntil(wait: Deadline) {
    setTarget((current) => current && { ...current, wait })
  }

  if (!target || step === 'phone') {
    return (
      <PhoneEntryStep
        initialPhone={target?.phone}
        onResume={(phone) => {
          // The same number while its code is fresh: no new request (it would
          // be refused as rate-limited); go back to where it was.
          if (!target || target.phone !== phone) return false
          if (Date.now() >= target.wait.until) return false
          setStep(target.hasPassword ? 'password' : 'code')
          return true
        }}
        returnTo={returnTo}
        onCodeSent={codeSent}
      />
    )
  }

  if (step === 'password') {
    return (
      <PhonePasswordStep
        phone={target.phone}
        wait={target.wait}
        onSignedIn={signedIn}
        onUseCode={(sent) => {
          if (sent) waitUntil(deadlineIn(sent.resendAfterSeconds))
          setStep('code')
        }}
        onChangePhone={() => setStep('phone')}
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
      onEditPhone={() => setStep('phone')}
      onUsePassword={() => setStep('password')}
    />
  )
}
