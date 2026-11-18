import {
  addressStepStandsAlone,
  authHref,
  safeReturnTo,
} from '@/features/auth/lib/return-to'

/**
 * The auth frame's per-step chrome (presentation `AuthContainer` @ fdb5f6c):
 * where the round back button in the header goes from each route. The first
 * step of a flow, and routes that are not steps, have none. `/auth/account`
 * has none either: the account is signed in by then, and `/auth` would send
 * it on to its destination, out of sign-up. `/auth/interests` goes back to
 * the address step, which in sign-up keeps an account whose page it has just
 * created, so the address can still be changed (FE-AUTH-08).
 */
const BACK: Readonly<Record<string, string>> = {
  '/auth/otp': '/auth',
  '/auth/password': '/auth',
  '/auth/url': '/auth/account',
  '/auth/interests': '/auth/url',
  '/auth/login/email': '/auth',
  '/auth/register/email': '/auth',
  '/auth/forgot-password': '/auth/login/email',
  '/auth/reset-password': '/auth/forgot-password',
}

/**
 * The back target for `pathname` (locale-free), keeping the destination. The
 * address step opened from a page rather than sign-up (settings, the studio
 * checklist; FE-ONB-02) goes back to that page, not to the account step.
 */
export function authBackHref(pathname: string, returnTo?: string) {
  if (pathname === PAGE_ADDRESS_PATH && addressStepStandsAlone(returnTo)) {
    return safeReturnTo(returnTo)
  }
  const target = BACK[pathname]
  return target ? authHref(target, returnTo) : null
}

/**
 * The registration steps after the code: the account, the page address and
 * the interests (FE-AUTH-08; the owner's 2026-11-18 instruction, FQ-22).
 */
export const SIGN_UP_STEPS = 3

/** The route whose visual column shows the live page preview. */
export const PAGE_ADDRESS_PATH = '/auth/url'

/**
 * Step 3 of 3 of sign-up: the categories the account likes. Its visual
 * column previews how they re-order the sample creators.
 */
export const INTERESTS_PATH = '/auth/interests'
