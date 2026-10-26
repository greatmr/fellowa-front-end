'use server'

import { z } from 'zod'

import {
  changePassword,
  confirmPasswordReset,
  exchangeGoogleCode,
  fetchOwnProfile,
  InvalidAuthResponseError,
  requestPasswordReset,
  resendEmailCode,
  setCreatorAlias,
  submitCredentials,
  verifyAuthToken,
  verifyEmailCode,
} from '@/features/auth/api/auth-api'
import { validAuthRequestOrigin } from '@/features/auth/server/request-security'
import {
  authenticateToken,
  clearSession,
  readSession,
  saveSession,
  type AuthSession,
} from '@/features/auth/server/session'
import {
  createCredentialsSchema,
  createVerificationSchema,
} from '@/features/auth/schemas'
import type { ApiActionResult } from '@/lib/api/action-result'
import type {
  ConfirmPasswordResetPayload,
  CredentialsPayload,
  GoogleAuthPayload,
  ResetPasswordPayload,
} from '@/features/auth/types/auth-contract'
import type { AuthUser } from '@/features/auth/types'
import { ApiError } from '@/lib/api/errors'

const aliasSchema = z.object({ alias: z.string().min(3).max(255) })
const emailSchema = z.object({ email: z.string().email() })
const confirmResetSchema = z.object({
  token: z.string().min(16).max(128),
  newPassword: z.string().min(8),
})
const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
})
const googleSchema = z.object({
  code: z.string(),
  redirectUri: z.string(),
})

async function execute<T>(
  operation: () => Promise<T>
): Promise<ApiActionResult<T>> {
  try {
    return { ok: true, data: await operation() }
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        ok: false,
        status: error.status,
        code: error.code,
        isNetworkError: error.isNetworkError,
      }
    }
    if (error instanceof InvalidAuthResponseError) {
      return { ok: false, code: 'INVALID_AUTH_RESPONSE' }
    }
    return { ok: false }
  }
}

async function mutate<TInput, TData>(
  schema: z.ZodType<TInput>,
  input: unknown,
  operation: (input: TInput) => Promise<TData>
): Promise<ApiActionResult<TData>> {
  if (!(await validAuthRequestOrigin())) {
    return { ok: false, status: 403, code: 'INVALID_REQUEST' }
  }
  const parsed = schema.safeParse(input)
  if (!parsed.success)
    return { ok: false, status: 400, code: 'INVALID_REQUEST' }
  return execute(() => operation(parsed.data))
}

async function activeSession(): Promise<AuthSession> {
  const session = await readSession()
  if (!session) {
    await clearSession()
    throw new ApiError({ message: 'Session expired', status: 401 })
  }
  return session
}

async function establishSession(token: string): Promise<AuthUser> {
  const session = await authenticateToken(token)
  await saveSession(session)
  return session.user
}

export async function loginForHook(input: CredentialsPayload) {
  return mutate(createCredentialsSchema('login'), input, async (credentials) =>
    establishSession(await submitCredentials('login', credentials))
  )
}

export async function registerForHook(input: CredentialsPayload) {
  return mutate(
    createCredentialsSchema('register'),
    input,
    async (credentials) =>
      establishSession(await submitCredentials('register', credentials))
  )
}

export async function ownProfileForHook(
  userId: number
): Promise<ApiActionResult<AuthUser>> {
  return execute(async () => {
    const session = await activeSession()
    if (session.user.id !== userId) {
      throw new ApiError({
        message: 'Profile does not match session',
        status: 403,
      })
    }
    return session.user
  })
}

export async function verifyEmailForHook(input: { code: string }) {
  return mutate(createVerificationSchema(), input, async ({ code }) => {
    const session = await activeSession()
    if (!session.user.isVerified) {
      try {
        await verifyEmailCode(session.token, code)
      } catch (error) {
        if (!(
          error instanceof ApiError && error.code === 'AUTH_ALREADY_VERIFIED'
        )) {
          throw error
        }
      }
      const user = await fetchOwnProfile(session.token, session.user.id)
      if (!user.isVerified) throw new InvalidAuthResponseError()
    }
    return null
  })
}

export async function resendEmailForHook() {
  return mutate(z.undefined(), undefined, async () => {
    const session = await activeSession()
    if (session.user.isVerified) {
      throw new ApiError({
        message: 'Already verified',
        code: 'AUTH_ALREADY_VERIFIED',
        status: 400,
      })
    }
    await resendEmailCode(session.token)
    return null
  })
}

export async function setAliasForHook(input: { alias: string }) {
  return mutate(aliasSchema, input, async ({ alias }) => {
    const session = await activeSession()
    await setCreatorAlias(session.token, alias)
    return null
  })
}

export async function requestPasswordResetForHook(input: { email: string }) {
  return mutate(emailSchema, input, async ({ email }) => {
    await requestPasswordReset(email)
    return null
  })
}

export async function confirmPasswordResetForHook(
  input: ConfirmPasswordResetPayload
) {
  return mutate(confirmResetSchema, input, async (payload) => {
    await confirmPasswordReset(payload)
    return null
  })
}

export async function changePasswordForHook(input: ResetPasswordPayload) {
  return mutate(changePasswordSchema, input, async (payload) => {
    const session = await activeSession()
    await changePassword(session.token, payload)
    return null
  })
}

export async function exchangeGoogleCodeForHook(input: GoogleAuthPayload) {
  return mutate(googleSchema, input, async (payload) =>
    establishSession(await exchangeGoogleCode(payload))
  )
}

export async function verifyAuthTokenForHook() {
  return mutate(z.undefined(), undefined, async () => {
    const session = await activeSession()
    return verifyAuthToken(session.token)
  })
}

export async function logoutForHook() {
  return mutate(z.undefined(), undefined, async () => {
    await clearSession()
    return null
  })
}
