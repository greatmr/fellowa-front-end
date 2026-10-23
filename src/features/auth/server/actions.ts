'use server'

import { headers } from 'next/headers'

import {
  fetchOwnProfile,
  InvalidAuthResponseError,
  resendEmailCode,
  submitCredentials,
  verifyEmailCode,
} from '@/features/auth/api/auth-api'
import { authFeedbackCode } from '@/features/auth/lib/native-feedback'
import { safeReturnTo } from '@/features/auth/lib/return-to'
import {
  createCredentialsSchema,
  createVerificationSchema,
} from '@/features/auth/schemas'
import {
  authenticateToken,
  clearSession,
  isRejectedSession,
  readSession,
  saveSession,
} from '@/features/auth/server/session'
import type { AuthActionState, AuthErrorCode } from '@/features/auth/types'
import { redirect } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { ApiError } from '@/lib/api/errors'
import { env } from '@/lib/env'

function failure(error: AuthErrorCode): AuthActionState {
  return { status: 'error', error }
}

/** An explicit check also protects direct action calls outside the framework. */
async function validRequest(locale: Locale): Promise<boolean> {
  if (!routing.locales.some((supported) => supported === locale)) return false
  const origin = (await headers()).get('origin')
  if (!origin || !env.NEXT_PUBLIC_APP_URL) return false
  try {
    const requestOrigin = new URL(origin)
    const appOrigin = new URL(env.NEXT_PUBLIC_APP_URL)
    return (
      (appOrigin.protocol === 'https:' || appOrigin.protocol === 'http:') &&
      requestOrigin.origin === origin &&
      requestOrigin.origin === appOrigin.origin
    )
  } catch {
    return false
  }
}

function mapFailure(error: unknown): AuthErrorCode {
  if (error instanceof InvalidAuthResponseError) return 'invalidResponse'
  if (!(error instanceof ApiError)) return 'unexpected'
  if (error.status === 429) return 'rateLimited'
  if (error.isNetworkError) return 'network'
  if (error.status !== undefined && error.status >= 500) return 'unavailable'
  switch (error.code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return 'invalidCredentials'
    case 'AUTH_EMAIL_TAKEN':
      return 'emailTaken'
    case 'AUTH_INVALID_CODE':
      return 'invalidCode'
    case 'AUTH_ALREADY_VERIFIED':
      return 'alreadyVerified'
    default:
      return 'unexpected'
  }
}

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

async function respondToNativeForm(
  state: AuthActionState,
  mode: 'login' | 'register' | 'verify-email',
  locale: Locale,
  returnTo: unknown = '/studio'
): Promise<AuthActionState> {
  if (!routing.locales.some((supported) => supported === locale)) return state
  const requestHeaders = await headers()
  const contentType = requestHeaders
    .get('content-type')
    ?.split(';')[0]
    ?.trim()
    .toLowerCase()
  if (
    contentType !== 'multipart/form-data' ||
    requestHeaders.has('next-action')
  ) {
    return state
  }
  const feedback = authFeedbackCode(state)
  if (!feedback) return state
  // Next's PPR native-action resume may omit formState. A fresh GET renders
  // the same allowlisted feedback even before JavaScript is available.
  return redirect({
    href: {
      pathname: `/auth/${feedback === 'expiredSession' ? 'login' : mode}`,
      query: { returnTo: safeReturnTo(returnTo), feedback },
    },
    locale,
  })
}

async function credentialsAction(
  mode: 'login' | 'register',
  locale: Locale,
  returnTo: string,
  formData: FormData
): Promise<AuthActionState> {
  if (!(await validRequest(locale))) return failure('invalidRequest')
  const result = createCredentialsSchema(mode).safeParse({
    email: stringField(formData, 'email'),
    password: stringField(formData, 'password'),
  })
  if (!result.success) {
    const fieldErrors: Extract<
      AuthActionState,
      { status: 'error' }
    >['fieldErrors'] = {}
    for (const issue of result.error.issues) {
      if (issue.path[0] === 'email') fieldErrors.email = 'email'
      if (issue.path[0] === 'password') {
        fieldErrors.password =
          mode === 'register' ? 'passwordLength' : 'passwordRequired'
      }
    }
    return { status: 'error', fieldErrors }
  }

  let verified: boolean
  try {
    const token = await submitCredentials(mode, result.data)
    const session = await authenticateToken(token)
    await saveSession(session)
    verified = session.user.isVerified
  } catch (error) {
    return failure(mapFailure(error))
  }

  const destination = safeReturnTo(returnTo)
  return redirect({
    href: verified
      ? destination
      : {
          pathname: '/auth/verify-email',
          query: { returnTo: destination },
        },
    locale,
  })
}

export async function loginAction(
  locale: Locale,
  returnTo: string,
  _previous: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  return respondToNativeForm(
    await credentialsAction('login', locale, returnTo, formData),
    'login',
    locale,
    returnTo
  )
}

export async function registerAction(
  locale: Locale,
  returnTo: string,
  _previous: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  return respondToNativeForm(
    await credentialsAction('register', locale, returnTo, formData),
    'register',
    locale,
    returnTo
  )
}

async function verifyEmail(
  locale: Locale,
  returnTo: string,
  formData: FormData
): Promise<AuthActionState> {
  if (!(await validRequest(locale))) return failure('invalidRequest')
  const result = createVerificationSchema().safeParse({
    code: stringField(formData, 'code'),
  })
  if (!result.success) {
    return { status: 'error', fieldErrors: { code: 'code' } }
  }

  try {
    const session = await readSession()
    if (!session) {
      await clearSession()
      return failure('expiredSession')
    }

    if (!session.user.isVerified) {
      try {
        await verifyEmailCode(session.token, result.data.code)
      } catch (error) {
        // A second tab may have verified this account. Only a fresh profile
        // may establish that state; the error code itself is not authority.
        if (!(
          error instanceof ApiError && error.code === 'AUTH_ALREADY_VERIFIED'
        )) {
          throw error
        }
      }
      const user = await fetchOwnProfile(session.token, session.user.id)
      if (!user.isVerified) return failure('invalidResponse')
    }
  } catch (error) {
    if (isRejectedSession(error)) {
      await clearSession()
      return failure('expiredSession')
    }
    return failure(mapFailure(error))
  }

  // Do not rewrite the session cookie: verifying an email never renews a JWT.
  return redirect({ href: safeReturnTo(returnTo), locale })
}

async function resendEmail(locale: Locale): Promise<AuthActionState> {
  // Identity comes from the cookie and backend, never the submitted form/state.
  if (!(await validRequest(locale))) return failure('invalidRequest')
  try {
    const session = await readSession()
    if (!session) {
      await clearSession()
      return failure('expiredSession')
    }
    if (session.user.isVerified) return failure('alreadyVerified')
    await resendEmailCode(session.token)
    return { status: 'sent' }
  } catch (error) {
    if (isRejectedSession(error)) {
      await clearSession()
      return failure('expiredSession')
    }
    return failure(mapFailure(error))
  }
}

async function logout(locale: Locale): Promise<AuthActionState> {
  if (!(await validRequest(locale))) return failure('invalidRequest')
  // The current backend has no revocation endpoint. End this browser session.
  await clearSession()
  return redirect({ href: '/auth/login', locale })
}

export async function verifyEmailAction(
  locale: Locale,
  returnTo: string,
  _previous: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  return respondToNativeForm(
    await verifyEmail(locale, returnTo, formData),
    'verify-email',
    locale,
    returnTo
  )
}

export async function resendEmailAction(
  locale: Locale,
  _previous: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  return respondToNativeForm(
    await resendEmail(locale),
    'verify-email',
    locale,
    formData.get('returnTo')
  )
}

export async function logoutAction(
  locale: Locale,
  _previous: AuthActionState,
  _formData: FormData
): Promise<AuthActionState> {
  void _previous
  void _formData
  return respondToNativeForm(await logout(locale), 'login', locale)
}
