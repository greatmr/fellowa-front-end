import 'server-only'

import { z } from 'zod'

import type {
  AuthUser,
  ConfirmPasswordResetPayload,
  CredentialsPayload,
  ForgotPasswordPayload,
  GoogleAuthPayload,
  ResetPasswordPayload,
  SetAliasPayload,
  VerificationCodePayload,
  VerifyTokenPayload,
} from '@/features/auth/types'
import { apiGet, apiPost, apiPut, withBearer } from '@/lib/api/client'
import { parseEnvelope } from '@/lib/api/envelope'

export class InvalidAuthResponseError extends Error {
  constructor() {
    super('Invalid authentication response')
    this.name = 'InvalidAuthResponseError'
  }
}

const invalid = () => new InvalidAuthResponseError()

const userSchema = z.object({
  id: z.number().int().positive().safe(),
  email: z.string().email(),
  alias: z.string().nullable(),
  isVerified: z.boolean(),
})
const tokenSchema = z.object({ token: z.string().min(1) })
const messageSchema = z.object({ message: z.string() })
const verifiedTokenSchema = z.object({
  valid: z.literal(true),
  payload: z.object({
    sub: z.number().int().positive().safe(),
    email: z.string().email(),
    exp: z.number().int().positive().safe(),
  }),
})

export async function submitCredentials(
  mode: 'login' | 'register',
  credentials: CredentialsPayload
): Promise<string> {
  const response = await apiPost<unknown, CredentialsPayload>(
    `/auth/${mode}`,
    credentials
  )
  return parseEnvelope(tokenSchema, response, invalid).token
}

export async function fetchOwnProfile(
  token: string,
  userId: number
): Promise<AuthUser> {
  const response = await apiGet<unknown>(
    `/user/${userId}/profile`,
    withBearer(token)
  )
  const user = parseEnvelope(userSchema, response, invalid)
  if (user.id !== userId) throw invalid()
  return user
}

export async function verifyEmailCode(token: string, code: string) {
  const response = await apiPut<unknown, VerificationCodePayload>(
    '/auth/verify-code',
    { code },
    withBearer(token)
  )
  parseEnvelope(messageSchema, response, invalid)
}

export async function resendEmailCode(token: string) {
  const response = await apiPut<unknown>(
    '/auth/resend-code',
    undefined,
    withBearer(token)
  )
  parseEnvelope(messageSchema, response, invalid)
}

export async function setCreatorAlias(token: string, alias: string) {
  const response = await apiPut<unknown, SetAliasPayload>(
    '/auth/alias',
    { alias },
    withBearer(token)
  )
  parseEnvelope(messageSchema, response, invalid)
}

export async function requestPasswordReset(email: string) {
  const response = await apiPost<unknown, ForgotPasswordPayload>(
    '/auth/forgot-password',
    { email }
  )
  parseEnvelope(messageSchema, response, invalid)
}

export async function confirmPasswordReset(input: ConfirmPasswordResetPayload) {
  const response = await apiPost<unknown, ConfirmPasswordResetPayload>(
    '/auth/reset-password/confirm',
    input
  )
  parseEnvelope(messageSchema, response, invalid)
}

export async function changePassword(
  token: string,
  input: ResetPasswordPayload
) {
  const response = await apiPut<unknown, ResetPasswordPayload>(
    '/auth/reset-password',
    input,
    withBearer(token)
  )
  parseEnvelope(messageSchema, response, invalid)
}

export async function exchangeGoogleCode(
  input: GoogleAuthPayload
): Promise<string> {
  const response = await apiPost<unknown, GoogleAuthPayload>(
    '/auth/google',
    input
  )
  return parseEnvelope(tokenSchema, response, invalid).token
}

export async function verifyAuthToken(token: string): Promise<true> {
  const response = await apiPost<unknown, VerifyTokenPayload>(
    '/auth/verify-token',
    { token }
  )
  return parseEnvelope(verifiedTokenSchema, response, invalid).valid
}
