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
 * the address step in its return mode (`BACK_FROM_INTERESTS`), which keeps the
 * page it has just created, so the address can still be changed (FE-AUTH-08);
 * the category step goes back to the interests.
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
 * The query that opens the address step as a return from the interests step
 * (FE-AUTH-08): the account's page exists, and its address may still change.
 * Harmless if typed by hand: it only ever shows the account its own page.
 */
export const BACK_FROM_INTERESTS: Readonly<Record<string, string>> = {
  from: 'interests',
}

/** Whether the address step's `from` query is {@link BACK_FROM_INTERESTS}. */
export function returnsFromInterests(from: unknown): boolean {
  return from === BACK_FROM_INTERESTS.from
}

/**
 * The back target for `pathname` (locale-free), keeping the destination. The
 * address step opened from a page rather than sign-up (settings, the studio
 * checklist; FE-ONB-02) goes back to that page, not to the account step. In
 * its return mode (`from`) it goes back to the interests: the account step
 * would end sign-up there, skipping the interests and the category.
 */
export function authBackHref(
  pathname: string,
  returnTo?: string,
  from?: string | null
) {
  if (pathname === PAGE_ADDRESS_PATH) {
    if (addressStepStandsAlone(returnTo)) return safeReturnTo(returnTo)
    if (returnsFromInterests(from)) return INTERESTS_PATH
  }
  const target = BACK[pathname]
  if (!target) return null
  return pathname === INTERESTS_PATH
    ? authHref(target, returnTo, { ...BACK_FROM_INTERESTS })
    : authHref(target, returnTo)
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
