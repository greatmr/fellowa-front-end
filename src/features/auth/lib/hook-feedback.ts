import type { AuthActionState, AuthErrorCode } from '@/features/auth/types'
import type { ApiError } from '@/lib/api/errors'

export function hookFeedback(
  error: ApiError | null,
  guarded = false
): AuthActionState {
  if (!error) return { status: 'idle' }
  let code: AuthErrorCode = 'unexpected'
  if (error.code === 'INVALID_AUTH_RESPONSE') code = 'invalidResponse'
  else if (error.code === 'INVALID_REQUEST') code = 'invalidRequest'
  else if (error.status === 429) code = 'rateLimited'
  else if (error.isNetworkError) code = 'network'
  else if (error.status !== undefined && error.status >= 500)
    code = 'unavailable'
  else {
    switch (error.code) {
      case 'AUTH_INVALID_CREDENTIALS':
        code = 'invalidCredentials'
        break
      case 'AUTH_EMAIL_TAKEN':
        code = 'emailTaken'
        break
      case 'AUTH_INVALID_CODE':
        code = 'invalidCode'
        break
      case 'AUTH_ALREADY_VERIFIED':
        code = 'alreadyVerified'
        break
      default:
        if (guarded && [401, 403, 404].includes(error.status ?? 0)) {
          code = 'expiredSession'
        }
    }
  }
  return { status: 'error', error: code }
}
