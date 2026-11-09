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
  /**
   * The account's own name (owner-only, Q-63); `null` while it holds the
   * backend's placeholder (no name given yet).
   */
  displayName: string | null
  /** The account has a password (BE-AUTH-10); the hash is never sent. */
  hasPassword: boolean
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
  /** The verified number (`user.phone` of the response), shown once, never stored. */
  phone: string | null
  isNewUser: boolean
  needsProfile: boolean
  hasPassword: boolean
}

/**
 * `POST /auth/google` (BE-AUTH-10), with the token the server keeps in the
 * session cookie. Never sent to the browser.
 */
export type GoogleSignIn = {
  token: string
  isNewUser: boolean
  needsProfile: boolean
  hasPassword: boolean
}

/**
 * `GET /auth/alias/availability` (BE-AUTH-09): whether `PUT /auth/alias` with
 * this input would succeed now. A snapshot, not a reservation.
 */
export type AliasAvailability = {
  /** Normalized when the format is valid; the trimmed input otherwise. */
  alias: string
  available: boolean
  reason: 'too_short' | 'invalid' | 'reserved' | 'taken' | null
  /** Only for `taken`: 0–3 valid, free aliases. */
  suggestions: string[]
}
