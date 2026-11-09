'use server'

import { redirect } from 'next/navigation'
import { hasLocale } from 'next-intl'

import { validAuthRequestOrigin } from '@/features/auth/server/request-security'
import { beginGoogleSignIn } from '@/features/auth/server/google-sign-in'
import { getPathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

/**
 * "Sign in with Google" (the entry screen's form): sends the browser to
 * Google's consent screen. A request from another origin, or a deployment
 * without a Google client id, stays on the entry screen.
 */
export async function startGoogleSignInAction(formData: FormData) {
  const locale = formData.get('locale')
  const returnTo = formData.get('returnTo')
  const safeLocale = hasLocale(routing.locales, locale)
    ? locale
    : routing.defaultLocale

  const consentUrl = (await validAuthRequestOrigin())
    ? await beginGoogleSignIn({
        locale: safeLocale,
        ...(typeof returnTo === 'string' && returnTo ? { returnTo } : {}),
      })
    : null

  // `redirect` throws; it stays outside any try block.
  redirect(
    consentUrl ??
      getPathname({
        href: { pathname: '/auth', query: { googleError: 'failed' } },
        locale: safeLocale,
      })
  )
}
