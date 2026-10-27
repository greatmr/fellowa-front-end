import { describe, expect, it } from 'vitest'

import { runApiAction, unwrapApiActionResult } from '@/lib/api/action-result'
import { ApiError } from '@/lib/api/errors'

describe('runApiAction', () => {
  it('wraps a resolved value', async () => {
    expect(await runApiAction(async () => 5)).toEqual({ ok: true, data: 5 })
  })

  it('serializes an ApiError without its message or cause', async () => {
    const result = await runApiAction(async () => {
      throw new ApiError({ message: 'secret', status: 403, code: 'X' })
    })
    expect(result).toEqual({
      ok: false,
      status: 403,
      code: 'X',
      isNetworkError: false,
    })
  })

  it('maps feature errors through mapError and hides unknown ones', async () => {
    class Custom extends Error {}
    const mapped = await runApiAction(
      async () => {
        throw new Custom()
      },
      (error) => (error instanceof Custom ? { code: 'CUSTOM' } : undefined)
    )
    expect(mapped).toEqual({ ok: false, code: 'CUSTOM' })

    expect(
      await runApiAction(async () => {
        throw new Error('boom')
      })
    ).toEqual({ ok: false })
  })

  it('round-trips a failure into a thrown ApiError', () => {
    expect(() =>
      unwrapApiActionResult({ ok: false, status: 401, code: 'E' })
    ).toThrowError(expect.objectContaining({ status: 401, code: 'E' }))
  })
})
