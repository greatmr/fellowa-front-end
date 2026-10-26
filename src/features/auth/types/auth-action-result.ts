export type AuthActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false
      status?: number
      code?: string
      isNetworkError?: boolean
    }
