import type { AuthActionState, AuthErrorCode } from '@/features/auth/types'

const errorCodes = [
  'invalidCredentials',
  'emailTaken',
  'rateLimited',
  'network',
  'unavailable',
  'invalidResponse',
  'expiredSession',
  'invalidCode',
  'alreadyVerified',
  'invalidRequest',
  'unexpected',
] as const satisfies readonly AuthErrorCode[]

/** Query feedback is display-only; it never establishes identity or success. */
export function parseAuthFeedback(value: unknown): AuthActionState {
  const error = errorCodes.find((code) => code === value)
  if (error) return { status: 'error', error }

  switch (value) {
    case 'sent':
      return { status: 'sent' }
    case 'email':
      return { status: 'error', fieldErrors: { email: 'email' } }
    case 'passwordRequired':
    case 'passwordLength':
      return { status: 'error', fieldErrors: { password: value } }
    case 'emailPasswordRequired':
      return {
        status: 'error',
        fieldErrors: { email: 'email', password: 'passwordRequired' },
      }
    case 'emailPasswordLength':
      return {
        status: 'error',
        fieldErrors: { email: 'email', password: 'passwordLength' },
      }
    case 'code':
      return { status: 'error', fieldErrors: { code: 'code' } }
    default:
      return { status: 'idle' }
  }
}

/** Encode only finite public message keys, never form values or API details. */
export function authFeedbackCode(state: AuthActionState): string | null {
  if (state.status === 'idle') return null
  if (state.status === 'sent') return 'sent'
  if (state.error) {
    return errorCodes.find((code) => code === state.error) ?? 'unexpected'
  }

  const errors = state.fieldErrors
  if (errors?.code === 'code') return 'code'
  if (errors?.password === 'passwordRequired') {
    return errors.email === 'email'
      ? 'emailPasswordRequired'
      : 'passwordRequired'
  }
  if (errors?.password === 'passwordLength') {
    return errors.email === 'email' ? 'emailPasswordLength' : 'passwordLength'
  }
  if (errors?.email === 'email') return 'email'
  return 'unexpected'
}
