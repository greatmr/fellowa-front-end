export type AuthErrorCode =
  | 'invalidCredentials'
  | 'emailTaken'
  | 'rateLimited'
  | 'network'
  | 'unavailable'
  | 'invalidResponse'
  | 'expiredSession'
  | 'invalidCode'
  | 'alreadyVerified'
  | 'invalidRequest'
  | 'unexpected'

export type AuthFieldError =
  'email' | 'passwordRequired' | 'passwordLength' | 'code'

export type AuthActionState =
  { status: 'idle' } | { status: 'error'; error: AuthErrorCode }

export type AuthUser = {
  id: number
  email: string
  alias: string | null
  isVerified: boolean
}

export type AuthValidationMessages = Record<AuthFieldError, string>
