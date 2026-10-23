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

export function createVerificationSchema(
  messages: AuthValidationMessages = defaultMessages
) {
  return z.object({ code: z.string().regex(/^\d{6}$/, messages.code) })
}
