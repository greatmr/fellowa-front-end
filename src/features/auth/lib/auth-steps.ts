import { authHref } from '@/features/auth/lib/return-to'

/**
 * The auth frame's per-step chrome (presentation `AuthContainer` @ fdb5f6c):
 * where the round back button in the header goes from each route. The first
 * step of a flow, and routes that are not steps, have none. `/auth/account`
 * has none either: the account is signed in by then, and `/auth` would send
 * it on to its destination, out of sign-up.
 */
const BACK: Readonly<Record<string, string>> = {
  '/auth/otp': '/auth',
  '/auth/password': '/auth',
  '/auth/url': '/auth/account',
  '/auth/login/email': '/auth',
  '/auth/register/email': '/auth',
  '/auth/forgot-password': '/auth/login/email',
  '/auth/reset-password': '/auth/forgot-password',
}

/** The back target for `pathname` (locale-free), keeping the destination. */
export function authBackHref(pathname: string, returnTo?: string) {
  const target = BACK[pathname]
  return target ? authHref(target, returnTo) : null
}

/** The registration steps after the code (FQ-4 leaves interests out). */
export const SIGN_UP_STEPS = 2

/** The route whose visual column shows the live page preview. */
export const PAGE_ADDRESS_PATH = '/auth/url'
