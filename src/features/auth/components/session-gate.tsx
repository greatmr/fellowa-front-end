import type { ReactNode } from 'react'

import { getSession } from '@/features/auth/server/session'
import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

/** A rendering gate; protected data helpers must also authorize each request. */
export async function SessionGate({
  children,
  locale,
}: {
  children: ReactNode
  locale: Locale
}) {
  const session = await getSession()
  if (!session) {
    return redirect({ href: '/auth/login', locale })
  }
  if (!session.user.isVerified) {
    return redirect({ href: '/auth/verify-email', locale })
  }
  return children
}
