import { z } from 'zod'

import type { AuthValidationMessages } from '@/features/auth/types'

const defaultMessages: AuthValidationMessages = {
  email: 'email',
  passwordRequired: 'passwordRequired',
  passwordLength: 'passwordLength',
  code: 'code',
}

export function createCredentialsSchema(
  mode: 'login' | 'register',
  messages: AuthValidationMessages = defaultMessages
) {
  return z.object({
    email: z.string().trim().email(messages.email),
    password: z.string().min(mode === 'register' ? 8 : 1, {
      message:
        mode === 'register'
          ? messages.passwordLength
          : messages.passwordRequired,
    }),
  })
}

export function createForgotPasswordSchema(
  messages: Pick<AuthValidationMessages, 'email'> = defaultMessages
) {
  return z.object({ email: z.string().trim().email(messages.email) })
}

/** Limits from the backend's `ConfirmPasswordResetDto`. */
export function createResetPasswordSchema(
  messages: { token: string; passwordLength: string } = {
    token: 'resetToken',
    passwordLength: defaultMessages.passwordLength,
  }
) {
  return z.object({
    token: z.string().trim().min(16, messages.token).max(128, messages.token),
    newPassword: z.string().min(8, messages.passwordLength),
  })
}

export function createVerificationSchema(
  messages: AuthValidationMessages = defaultMessages
) {
  return z.object({ code: z.string().regex(/^\d{6}$/, messages.code) })
}

/** The backend's alias rules (`alias-rules.ts`, BE-USER-04; CP-02 [DOC]). */
export const ALIAS_MIN_LENGTH = 3
export const ALIAS_MAX_LENGTH = 30

export type AliasValidationMessages = {
  tooShort: string
  tooLong: string
  chars: string
}

/**
 * One schema for the form and the server action. Only trimmed: the case is the
 * backend's to normalize, and the charset check has to see the typed value.
 */
export function createAliasSchema(
  messages: AliasValidationMessages = {
    tooShort: 'aliasTooShort',
    tooLong: 'aliasTooLong',
    chars: 'aliasChars',
  }
) {
  return z.object({
    alias: z
      .string()
      .trim()
      .min(ALIAS_MIN_LENGTH, messages.tooShort)
      .max(ALIAS_MAX_LENGTH, messages.tooLong)
      .regex(/^[A-Za-z0-9_]+$/, messages.chars),
  })
}

/** What the backend stores for a valid alias: `Studio` reads back `studio`. */
export function normalizeAlias(alias: string): string {
  return alias.trim().toLowerCase()
}
