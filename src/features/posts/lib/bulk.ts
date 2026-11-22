import { ApiError } from '@/lib/api/errors'

/**
 * Bulk publish, draft and delete run one post at a time through the per-post
 * routes (FQ-30 (5), reversed 2026-11-22): there is no bulk route for them.
 * At most `concurrency` requests are in flight, never one per post at once.
 */
export const BULK_CONCURRENCY = 3

export type BulkOutcome<T> = { item: T; error: ApiError | null }

export type BulkProgress = { done: number; total: number }

function asApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError({ message: 'Bulk item failed', cause: error })
}

/**
 * Runs `worker` over `items`, keeping their order in the result. A failure
 * is recorded for its item and the rest go on, except an expired session
 * (401): every item not yet started then fails with it, unsent, since each
 * would be refused the same way.
 */
export async function runBulk<T>(
  items: readonly T[],
  worker: (item: T) => Promise<unknown>,
  {
    concurrency = BULK_CONCURRENCY,
    onProgress,
  }: {
    concurrency?: number
    onProgress?: (progress: BulkProgress) => void
  } = {}
): Promise<BulkOutcome<T>[]> {
  const outcomes: (BulkOutcome<T> | undefined)[] = new Array(items.length)
  let next = 0
  let done = 0
  let stopped: ApiError | null = null

  const settle = (index: number, error: ApiError | null) => {
    outcomes[index] = { item: items[index] as T, error }
    done += 1
    onProgress?.({ done, total: items.length })
  }

  async function lane() {
    while (next < items.length) {
      const index = next
      next += 1
      if (stopped) {
        settle(index, stopped)
        continue
      }
      try {
        await worker(items[index] as T)
        settle(index, null)
      } catch (error) {
        const failure = asApiError(error)
        if (failure.status === 401) stopped = failure
        settle(index, failure)
      }
    }
  }

  const lanes = Math.max(1, Math.min(concurrency, items.length))
  await Promise.all(Array.from({ length: lanes }, lane))
  return outcomes.filter((o): o is BulkOutcome<T> => o !== undefined)
}

/** Splits ids into requests of at most `size` (the API's 100-id limit). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size))
  return out
}
