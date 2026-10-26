import { ApiError } from '@/lib/api/errors'

/** Serializable outcome for a server action called by a React Query hook. */
export type ApiActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false
      status?: number
      code?: string
      isNetworkError?: boolean
    }

export function unwrapApiActionResult<T>(result: ApiActionResult<T>): T {
  if (result.ok) return result.data
  throw new ApiError({
    message: 'API request failed',
    status: result.status,
    code: result.code,
    isNetworkError: result.isNetworkError,
  })
}
