'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { Deadline } from '@/features/auth/lib/phone'

/** The number a code was sent to, and how long until another may be asked. */
export type PhoneTarget = {
  phone: string
  hasPassword: boolean
  wait: Deadline
}

type AuthFlow = {
  /** Set by the entry step; read by the code and password steps. */
  target: PhoneTarget | null
  setTarget: (
    update: (current: PhoneTarget | null) => PhoneTarget | null
  ) => void
  /** `user.phone` of the sign-in response, for the account step's line. */
  signedInPhone: string | null
  setSignedInPhone: (phone: string | null) => void
  /** The name saved on the account step, for the live page preview. */
  pageName: string
  setPageName: (name: string) => void
  /** The address being typed on the address step, for the live preview. */
  pageAddress: string
  setPageAddress: (address: string) => void
}

const AuthFlowContext = createContext<AuthFlow | null>(null)

/**
 * What the per-step auth routes share (`/auth` → `/auth/otp` →
 * `/auth/account` → `/auth/url`). It lives in the auth layout, in memory only:
 * the number and the name never reach storage, the token stays in the
 * httpOnly cookie, and a reload starts the flow again.
 */
export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<PhoneTarget | null>(null)
  const [signedInPhone, setSignedInPhone] = useState<string | null>(null)
  const [pageName, setPageName] = useState('')
  const [pageAddress, setPageAddress] = useState('')

  const value = useMemo(
    () => ({
      target,
      setTarget,
      signedInPhone,
      setSignedInPhone,
      pageName,
      setPageName,
      pageAddress,
      setPageAddress,
    }),
    [target, signedInPhone, pageName, pageAddress]
  )

  return (
    <AuthFlowContext.Provider value={value}>
      {children}
    </AuthFlowContext.Provider>
  )
}

export function useAuthFlow(): AuthFlow {
  const flow = useContext(AuthFlowContext)
  if (!flow) throw new Error('useAuthFlow outside AuthFlowProvider')
  return flow
}
