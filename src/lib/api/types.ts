/**
 * Shared API shapes. The backend's AllExceptionsFilter / response wrapper
 * returns `{ data, errors }`: `errors` is null on success and `data` is null on
 * failure. Pagination is intentionally absent — its parameter names and
 * envelope are not uniform across modules, so each list types its own.
 */
export type Maybe<T> = T | null | undefined

export type ApiErrorItem = { message: string; code?: string }

export type ApiSuccessEnvelope<TData> = { data: TData; errors: null }

export type ApiFailureEnvelope = { data: null; errors: ApiErrorItem[] }

export type ApiEnvelope<TData> = ApiSuccessEnvelope<TData> | ApiFailureEnvelope
