import 'server-only'

import { z } from 'zod'

import type {
  AuthUser,
  CompleteAccountPayload,
  ConfirmPasswordResetPayload,
  CredentialsPayload,
  ForgotPasswordPayload,
  GoogleAuthPayload,
  PhoneCodeRequestPayload,
  PhoneCodeSent,
  PhoneLoginPayload,
  PhoneVerifyPayload,
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
  // `null` for a phone-only account (BE-AUTH-08).
  email: z.string().email().nullable(),
  alias: z.string().nullable(),
  isVerified: z.boolean(),
})
const tokenSchema = z.object({ token: z.string().min(1) })
const messageSchema = z.object({ message: z.string() })
const verifiedTokenSchema = z.object({
  valid: z.literal(true),
  payload: z.object({
    sub: z.number().int().positive().safe(),
    email: z.string().email().nullable(),
    exp: z.number().int().positive().safe(),
  }),
})

const seconds = z.number().int().nonnegative().safe()
const phoneCodeSentSchema = z.object({
  phone: z.string().regex(/^09\d{9}$/),
  hasAccount: z.boolean(),
  hasPassword: z.boolean(),
  resendAfterSeconds: seconds,
  expiresInSeconds: seconds,
})
/** Only what the client routes on; `user` comes from the profile check. */
const phoneSignInSchema = z.object({
  token: z.string().min(1),
  isNewUser: z.boolean(),
  needsProfile: z.boolean(),
  hasPassword: z.boolean(),
})
const completedAccountSchema = z.object({
  displayName: z.string(),
  hasPassword: z.boolean(),
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

/** `POST /auth/phone/request-code` (BE-AUTH-08). */
export async function requestPhoneCode(phone: string): Promise<PhoneCodeSent> {
  const response = await apiPost<unknown, PhoneCodeRequestPayload>(
    '/auth/phone/request-code',
    { phone }
  )
  return parseEnvelope(phoneCodeSentSchema, response, invalid)
}

/** `POST /auth/phone/verify`: signs in, creating the account the first time. */
export async function verifyPhoneCode(input: PhoneVerifyPayload) {
  const response = await apiPost<unknown, PhoneVerifyPayload>(
    '/auth/phone/verify',
    input
  )
  return parseEnvelope(phoneSignInSchema, response, invalid)
}

/** `POST /auth/phone/login`: a returning account that has set a password. */
export async function loginWithPhonePassword(input: PhoneLoginPayload) {
  const response = await apiPost<unknown, PhoneLoginPayload>(
    '/auth/phone/login',
    input
  )
  return parseEnvelope(phoneSignInSchema, response, invalid)
}

/** `PUT /auth/account`: the display name and, optionally, a first password. */
export async function completeAccount(
  token: string,
  input: CompleteAccountPayload
) {
  const response = await apiPut<unknown, CompleteAccountPayload>(
    '/auth/account',
    input,
    withBearer(token)
  )
  return parseEnvelope(completedAccountSchema, response, invalid)
}
