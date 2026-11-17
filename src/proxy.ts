import createMiddleware from 'next-intl/middleware'
import { NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'

const handleI18nRouting = createMiddleware(routing)

/**
 * Locale routing (FE-I18N-01). Persian unless the `NEXT_LOCALE` cookie says
 * otherwise: the browser's language is dropped before next-intl resolves the
 * locale, so a visitor whose browser prefers English still gets Persian until
 * they pick English in the switcher. next-intl then rewrites `/x` to
 * `/<locale>/x` and redirects a prefixed `/fa/x` or `/en/x` (query kept) to
 * `/x`, setting the cookie to the prefix's locale.
 */
export default function proxy(request: NextRequest) {
  return handleI18nRouting(withoutBrowserLanguage(request))
}

/**
 * A copy of the request without `Accept-Language`, for locale resolution only.
 * Built from the URL and headers, not from the request itself, so the original
 * body (a server action's POST) is never touched; next-intl reads only the
 * URL, headers and cookies.
 */
export function withoutBrowserLanguage(request: NextRequest): NextRequest {
  if (!request.headers.has('accept-language')) return request
  // Copied entry by entry: `new Headers(init)` with a headers object from
  // another implementation (Next's request vs the global `Headers`) silently
  // drops entries, the cookie among them — proxy.test.ts pins this.
  const headers = new Headers()
  request.headers.forEach((value, key) => {
    if (key !== 'accept-language') headers.append(key, value)
  })
  // `basePath` is carried over so next-intl's redirects and cookie path stay
  // right if one is ever configured.
  return new NextRequest(request.url, {
    method: request.method,
    headers,
    nextConfig: { basePath: request.nextUrl.basePath },
  })
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
