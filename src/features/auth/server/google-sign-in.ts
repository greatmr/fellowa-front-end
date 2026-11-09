import 'server-only'

import { randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { z } from 'zod'

import { exchangeGoogleCode } from '@/features/auth/api/auth-api'
import type { GoogleErrorKind } from '@/features/auth/lib/google-error'
import {
  afterAccountDestination,
  requestedReturnTo,
} from '@/features/auth/lib/return-to'
import { authenticateToken, saveSession } from '@/features/auth/server/session'
import { routing, type Locale } from '@/i18n/routing'
import { ApiError } from '@/lib/api/errors'
import { env } from '@/lib/env'

/**
 * Google sign-in (FE-AUTH-04 against BE-AUTH-07, `POST /auth/google`):
 * authorization-code flow. The front-end sends the browser to Google with a
 * one-time `state` bound to an httpOnly cookie; the callback route checks it,
 * hands the code to the backend (which holds the client secret) and keeps the
 * returned token in the session cookie, as every other sign-in does.
 */

/**
 * One pending sign-in per browser: starting a second one (another tab)
 * replaces the first, whose callback then fails as a state mismatch.
 */
export const GOOGLE_STATE_COOKIE = 'fellowa_google_oauth'
const STATE_MAX_AGE_SECONDS = 10 * 60
const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

const pendingSchema = z.object({
  state: z.string().min(32).max(128),
  returnTo: z.string().optional(),
  locale: z.enum(routing.locales),
})
type Pending = z.infer<typeof pendingSchema>

/** Google is offered only when its public client id and the app URL are set. */
export function googleSignInEnabled(): boolean {
  return Boolean(env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && env.NEXT_PUBLIC_APP_URL)
}

/**
 * One locale-free callback, so Google needs one registered redirect URI; the
 * locale travels in the cookie.
 */
export function googleRedirectUri(): string | null {
  if (!env.NEXT_PUBLIC_APP_URL) return null
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')}/auth/google/callback`
}

function encodePending(pending: Pending) {
  return Buffer.from(JSON.stringify(pending)).toString('base64url')
}

function decodePending(value: string | undefined): Pending | null {
  if (!value || value.length > 1024) return null
  try {
    const parsed = pendingSchema.safeParse(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    )
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function sameState(expected: string, received: string) {
  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  return a.length === b.length && timingSafeEqual(a, b)
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
})

/**
 * Starts a sign-in: remembers a fresh `state` (and where to go afterwards) in
 * an httpOnly cookie and returns Google's consent URL, or `null` when Google
 * is not configured.
 */
export async function beginGoogleSignIn(input: {
  returnTo?: string
  locale: Locale
}): Promise<string | null> {
  const clientId = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const redirectUri = googleRedirectUri()
  if (!clientId || !redirectUri) return null

  const state = randomBytes(32).toString('base64url')
  const returnTo = requestedReturnTo(input.returnTo)
  ;(await cookies()).set(
    GOOGLE_STATE_COOKIE,
    encodePending({
      state,
      locale: input.locale,
      ...(returnTo ? { returnTo } : {}),
    }),
    { ...cookieOptions(), maxAge: STATE_MAX_AGE_SECONDS }
  )

  const url = new URL(AUTHORIZE_URL)
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    // `openid` or Google sends no `sub` (BE-AUTH-07).
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  }).toString()
  return url.toString()
}

export type GoogleCallbackResult = {
  /** Where the browser goes next (a locale-free href). */
  href: string | { pathname: string; query: Record<string, string> }
  locale: Locale | null
}

function errorKind(error: unknown): GoogleErrorKind {
  if (!(error instanceof ApiError)) return 'failed'
  switch (error.code) {
    case 'AUTH_GOOGLE_EMAIL_NOT_VERIFIED':
      return 'emailNotVerified'
    case 'AUTH_NOT_GOOGLE_ACCOUNT':
      return 'usePassword'
    case 'AUTH_GOOGLE_ALREADY_LINKED':
      return 'alreadyLinked'
    default:
      return 'failed'
  }
}

/**
 * The callback: the `state` must match the cookie's (one use: the cookie is
 * cleared first), then the code is exchanged and the session saved. A user who
 * cancelled at Google comes back to the entry screen without an error.
 */
export async function completeGoogleSignIn(params: {
  code: string | null
  state: string | null
  error: string | null
}): Promise<GoogleCallbackResult> {
  const cookieStore = await cookies()
  const pending = decodePending(cookieStore.get(GOOGLE_STATE_COOKIE)?.value)
  cookieStore.set(GOOGLE_STATE_COOKIE, '', {
    ...cookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  })

  const returnTo = pending?.returnTo
  const locale = pending?.locale ?? null
  const back = (kind?: GoogleErrorKind) => ({
    href: {
      pathname: '/auth',
      query: {
        ...(returnTo ? { returnTo } : {}),
        ...(kind ? { googleError: kind } : {}),
      },
    },
    locale,
  })

  if (!pending || !params.state || !sameState(pending.state, params.state)) {
    return back('failed')
  }
  if (params.error === 'access_denied') return back()
  const redirectUri = googleRedirectUri()
  if (params.error || !params.code || !redirectUri) return back('failed')

  try {
    const token = await exchangeGoogleCode({ code: params.code, redirectUri })
    const session = await authenticateToken(token)
    await saveSession(session)
    return {
      href: afterAccountDestination(session.user, returnTo),
      locale,
    }
  } catch (error) {
    return back(errorKind(error))
  }
}
