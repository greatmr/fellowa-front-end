import { z } from 'zod'

import { normalizeIranianMobile } from '@/features/auth/lib/phone'
import type { AuthValidationMessages } from '@/features/auth/types'
import { toLatinDigits } from '@/lib/digits'

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

/** Limits from the phone sign-in DTOs (BE-AUTH-08). */
export const PHONE_CODE_LENGTH = 5
export const DISPLAY_NAME_MIN = 2
export const DISPLAY_NAME_MAX = 80
/** The API's minimum (`CompleteAccountDto`), not the prototype's 6 (FQ-16). */
export const PASSWORD_MIN = 8

export type PhoneValidationMessages = {
  phone: string
  code: string
  passwordRequired: string
  displayNameLength: string
  passwordLength: string
}

const phoneMessages: PhoneValidationMessages = {
  phone: 'phone',
  code: 'phoneCode',
  passwordRequired: 'passwordRequired',
  displayNameLength: 'displayNameLength',
  passwordLength: 'passwordLength',
}

/** Any input the API accepts, parsed to the `09XXXXXXXXX` it stores. */
function phoneField(message: string) {
  return z.string().transform((value, context) => {
    const phone = normalizeIranianMobile(value)
    if (phone) return phone
    context.addIssue({ code: 'custom', message })
    return z.NEVER
  })
}

export function createPhoneSchema(
  messages: Pick<PhoneValidationMessages, 'phone'> = phoneMessages
) {
  return z.object({ phone: phoneField(messages.phone) })
}

/** `code` takes Persian and Arabic-Indic digits too, as the DTO does. */
export function createPhoneVerifySchema(
  messages: Pick<PhoneValidationMessages, 'phone' | 'code'> = phoneMessages
) {
  return z.object({
    phone: phoneField(messages.phone),
    code: z
      .string()
      .transform((value) => toLatinDigits(value.trim()))
      .pipe(
        z
          .string()
          .regex(new RegExp(`^\\d{${PHONE_CODE_LENGTH}}$`), messages.code)
      ),
  })
}

export function createPhoneLoginSchema(
  messages: Pick<
    PhoneValidationMessages,
    'phone' | 'passwordRequired'
  > = phoneMessages
) {
  return z.object({
    phone: phoneField(messages.phone),
    password: z.string().min(1, messages.passwordRequired),
  })
}

/**
 * `CompleteAccountDto`: a trimmed name of 2–80 and an optional password of at
 * least 8. An empty password means "no password" and is left out.
 */
export function createCompleteAccountSchema(
  messages: Pick<
    PhoneValidationMessages,
    'displayNameLength' | 'passwordLength'
  > = phoneMessages
) {
  return z.object({
    displayName: z
      .string()
      .trim()
      .min(DISPLAY_NAME_MIN, messages.displayNameLength)
      .max(DISPLAY_NAME_MAX, messages.displayNameLength),
    password: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined))
      .pipe(z.string().min(PASSWORD_MIN, messages.passwordLength).optional()),
  })
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
