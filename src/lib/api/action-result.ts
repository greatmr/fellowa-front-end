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

/**
 * Run a server-action operation and fold any failure into a serializable
 * result. `mapError` lets a feature turn its own error class into a stable
 * `code`; anything unrecognized becomes a bare `{ ok: false }`.
 */
export async function runApiAction<T>(
  operation: () => Promise<T>,
  mapError?: (error: unknown) => { code: string } | undefined
): Promise<ApiActionResult<T>> {
  try {
    return { ok: true, data: await operation() }
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        ok: false,
        status: error.status,
        code: error.code,
        isNetworkError: error.isNetworkError,
      }
    }
    const mapped = mapError?.(error)
    return mapped ? { ok: false, code: mapped.code } : { ok: false }
  }
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
