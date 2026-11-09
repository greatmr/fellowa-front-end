export type AuthErrorCode =
  | 'invalidCredentials'
  | 'emailTaken'
  | 'rateLimited'
  | 'network'
  | 'unavailable'
  | 'invalidResponse'
  | 'expiredSession'
  | 'invalidCode'
  | 'tooManyAttempts'
  | 'resendCooldown'
  | 'invalidResetToken'
  | 'invalidRequest'
  | 'unexpected'
  | 'phoneInvalid'
  | 'phoneTaken'
  | 'codeInvalid'
  | 'codeExpired'
  | 'codeRateLimited'
  | 'codeLocked'
  | 'smsUnavailable'
  | 'passwordAlreadySet'

export type AuthFieldError =
  'email' | 'passwordRequired' | 'passwordLength' | 'code'

export type AuthActionState =
  { status: 'idle' } | { status: 'error'; error: AuthErrorCode }

export type AuthUser = {
  id: number
  /** `null` for an account made by phone sign-in (BE-AUTH-08). */
  email: string | null
  alias: string | null
  isVerified: boolean
}

export type AuthValidationMessages = Record<AuthFieldError, string>

/** `POST /auth/phone/request-code`: a code is on its way. */
export type PhoneCodeSent = {
  phone: string
  hasAccount: boolean
  hasPassword: boolean
  resendAfterSeconds: number
  expiresInSeconds: number
}

/** A phone sign-in, without the token, which stays in the session cookie. */
export type PhoneSignIn = {
  user: AuthUser
  isNewUser: boolean
  needsProfile: boolean
  hasPassword: boolean
}
