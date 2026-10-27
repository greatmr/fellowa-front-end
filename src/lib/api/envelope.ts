import { z } from 'zod'

import type { ApiSuccessEnvelope } from '@/lib/api/types'

/** Zod schema for a successful `{ data, errors: null }` response. */
export function successEnvelope<T>(
  schema: z.ZodType<T>
): z.ZodType<ApiSuccessEnvelope<T>> {
  return z.object({ data: schema, errors: z.null() })
}

/**
 * Validate an untrusted response body against its envelope and return `data`.
 * Throws the feature's own error so callers can map it to a stable code.
 */
export function parseEnvelope<T>(
  schema: z.ZodType<T>,
  value: unknown,
  invalid: () => Error
): T {
  const result = successEnvelope(schema).safeParse(value)
  if (!result.success) throw invalid()
  return result.data.data
}
