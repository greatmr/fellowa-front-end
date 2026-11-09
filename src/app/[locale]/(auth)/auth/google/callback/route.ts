import { hasLocale } from 'next-intl'
import type { NextRequest } from 'next/server'

import { completeGoogleSignIn } from '@/features/auth/server/google-sign-in'
import { redirect } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

/** Google's redirect back (FE-AUTH-04): check, exchange, then move on. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params
  const query = request.nextUrl.searchParams
  const result = await completeGoogleSignIn({
    code: query.get('code'),
    state: query.get('state'),
    error: query.get('error'),
  })
  return redirect({
    href: result.href,
    locale:
      result.locale ??
      (hasLocale(routing.locales, locale) ? locale : routing.defaultLocale),
  })
}
