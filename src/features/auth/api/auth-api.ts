import 'server-only'

import { z } from 'zod'

import type {
  ConfirmPasswordResetPayload,
  CredentialsPayload,
  ForgotPasswordPayload,
  GoogleAuthPayload,
  ResetPasswordPayload,
  SetAliasPayload,
  VerificationCodePayload,
  VerifyTokenPayload,
} from '@/features/auth/types/auth-contract'
import type { AuthUser } from '@/features/auth/types'
import { apiGet, apiPost, apiPut } from '@/lib/api/client'

export class InvalidAuthResponseError extends Error {
  constructor() {
    super('Invalid authentication response')
    this.name = 'InvalidAuthResponseError'
  }
}

const userSchema = z.object({
  id: z.number().int().positive().safe(),
  email: z.string().email(),
  alias: z.string().nullable(),
  isVerified: z.boolean(),
})

const credentialsResponseSchema = z.object({
  data: z.object({ token: z.string().min(1) }),
  errors: z.null(),
})

const profileResponseSchema = z.object({ data: userSchema, errors: z.null() })
const mutationResponseSchema = z.object({
  data: z.object({ message: z.string() }),
  errors: z.null(),
})
const verifiedTokenResponseSchema = z.object({
  data: z.object({
    valid: z.literal(true),
    payload: z.object({
      sub: z.number().int().positive().safe(),
      email: z.string().email(),
      exp: z.number().int().positive().safe(),
    }),
  }),
  errors: z.null(),
})

function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new InvalidAuthResponseError()
  return parsed.data
}

export async function submitCredentials(
  mode: 'login' | 'register',
  credentials: CredentialsPayload
): Promise<string> {
  const response = await apiPost<unknown, CredentialsPayload>(
    `/auth/${mode}`,
    credentials
  )
  return parseResponse(credentialsResponseSchema, response).data.token
}

export async function fetchOwnProfile(
  token: string,
  userId: number
): Promise<AuthUser> {
  const response = await apiGet<unknown>(`/user/${userId}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const user = parseResponse(profileResponseSchema, response).data
  if (user.id !== userId) throw new InvalidAuthResponseError()
  return user
}

export async function verifyEmailCode(token: string, code: string) {
  const response = await apiPut<unknown, VerificationCodePayload>(
    '/auth/verify-code',
    { code },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  parseResponse(mutationResponseSchema, response)
}

export async function resendEmailCode(token: string) {
  const response = await apiPut<unknown>('/auth/resend-code', undefined, {
    headers: { Authorization: `Bearer ${token}` },
  })
  parseResponse(mutationResponseSchema, response)
}

export async function setCreatorAlias(token: string, alias: string) {
  const response = await apiPut<unknown, SetAliasPayload>(
    '/auth/alias',
    { alias },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  parseResponse(mutationResponseSchema, response)
}

export async function requestPasswordReset(email: string) {
  const response = await apiPost<unknown, ForgotPasswordPayload>(
    '/auth/forgot-password',
    { email }
  )
  parseResponse(mutationResponseSchema, response)
}

export async function confirmPasswordReset(input: ConfirmPasswordResetPayload) {
  const response = await apiPost<unknown, ConfirmPasswordResetPayload>(
    '/auth/reset-password/confirm',
    input
  )
  parseResponse(mutationResponseSchema, response)
}

export async function changePassword(
  token: string,
  input: ResetPasswordPayload
) {
  const response = await apiPut<unknown, ResetPasswordPayload>(
    '/auth/reset-password',
    input,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  parseResponse(mutationResponseSchema, response)
}

export async function exchangeGoogleCode(
  input: GoogleAuthPayload
): Promise<string> {
  const response = await apiPost<unknown, GoogleAuthPayload>(
    '/auth/google',
    input
  )
  return parseResponse(credentialsResponseSchema, response).data.token
}

export async function verifyAuthToken(token: string): Promise<true> {
  const response = await apiPost<unknown, VerifyTokenPayload>(
    '/auth/verify-token',
    { token }
  )
  return parseResponse(verifiedTokenResponseSchema, response).data.valid
}
