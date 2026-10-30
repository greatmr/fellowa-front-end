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
