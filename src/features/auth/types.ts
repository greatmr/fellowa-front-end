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
  | { status: 'idle' }
  | {
      status: 'error'
      error?: AuthErrorCode
      fieldErrors?: Partial<
        Record<'email' | 'password' | 'code', AuthFieldError>
      >
    }
  | { status: 'sent' }

export type AuthFormAction = (
  previous: AuthActionState,
  formData: FormData
) => Promise<AuthActionState>

export type AuthUser = {
  id: number
  email: string
  alias: string | null
  isVerified: boolean
}

export type AuthValidationMessages = Record<AuthFieldError, string>
