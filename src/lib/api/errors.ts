import axios from 'axios'

/**
 * Normalized API failure.
 *
 * `messages` are the human-readable strings the backend returned, already
 * flattened. They are NOT guaranteed to be localized — render a translated
 * message keyed on `status` / `code` where the copy matters, and fall back to
 * these only for unexpected failures.
 */
export class ApiError extends Error {
  readonly status: number | undefined
  readonly code: string | undefined
  readonly messages: string[]
  readonly isNetworkError: boolean

  constructor(init: {
    message: string
    status?: number
    code?: string
    messages?: string[]
    isNetworkError?: boolean
    cause?: unknown
  }) {
    super(init.message, { cause: init.cause })
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.messages = init.messages ?? [init.message]
    this.isNetworkError = init.isNetworkError ?? false
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }

  get isNotFound() {
    return this.status === 404
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isNonblankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * AllExceptionsFilter returns `{ data: null, errors: [{ message, code }] }`.
 * Keep legacy NestJS bodies readable while deployments migrate. A code belongs
 * to the first usable envelope message, never to another malformed entry.
 */
function extractFailure(data: unknown): {
  messages: string[]
  code?: string
} {
  if (isNonblankString(data)) return { messages: [data] }
  if (!isRecord(data)) return { messages: [] }

  if (Array.isArray(data.errors)) {
    const entries = data.errors.filter(
      (entry): entry is Record<string, unknown> & { message: string } =>
        isRecord(entry) && isNonblankString(entry.message)
    )
    const first = entries[0]
    if (first) {
      return {
        messages: entries.map((entry) => entry.message),
        code: isNonblankString(first.code) ? first.code : undefined,
      }
    }
  }

  const messages = Array.isArray(data.message)
    ? data.message.filter(isNonblankString)
    : isNonblankString(data.message)
      ? [data.message]
      : []

  return {
    messages:
      messages.length || !isNonblankString(data.error)
        ? messages
        : [data.error],
    code: isNonblankString(data.code)
      ? data.code
      : isNonblankString(data.error)
        ? data.error
        : undefined,
  }
}

/** Turn anything thrown by the API layer into an `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const { messages, code } = extractFailure(error.response?.data)

    return new ApiError({
      message: messages[0] ?? error.message,
      status,
      code,
      messages: messages.length ? messages : [error.message],
      isNetworkError: !error.response,
      cause: error,
    })
  }

  return new ApiError({
    message: error instanceof Error ? error.message : 'Unexpected error',
    cause: error,
  })
}
