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
 * created, so the address can still be changed (FE-AUTH-08); the category
 * step goes back to the interests.
 */
const BACK: Readonly<Record<string, string>> = {
  '/auth/otp': '/auth',
  '/auth/password': '/auth',
  '/auth/url': '/auth/account',
  '/auth/interests': '/auth/url',
  '/auth/category': '/auth/interests',
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
 * The registration steps after the code: the account, the page address, the
 * interests and the page's category (FE-AUTH-08; the owner's answers to FQ-22
 * and FQ-23, 2026-11-18).
 */
export const SIGN_UP_STEPS = 4

/** The route whose visual column shows the live page preview. */
export const PAGE_ADDRESS_PATH = '/auth/url'

/**
 * Step 3 of 4 of sign-up: the categories the account likes. Its visual
 * column previews how they re-order the sample creators.
 */
export const INTERESTS_PATH = '/auth/interests'

/** Step 4 of 4 of sign-up: the one category of the page (FQ-23). */
export const PAGE_CATEGORY_PATH = '/auth/category'
