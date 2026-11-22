import { describe, expect, it } from 'vitest'

import { ApiError } from '@/lib/api/errors'

import { chunk, runBulk } from './bulk'

const wait = () => new Promise((resolve) => setTimeout(resolve, 1))

describe('runBulk', () => {
  it('never has more than the concurrency in flight, and keeps the order', async () => {
    let inFlight = 0
    let peak = 0
    const progress: number[] = []
    const result = await runBulk(
      [1, 2, 3, 4, 5, 6, 7],
      async (n) => {
        inFlight += 1
        peak = Math.max(peak, inFlight)
        await wait()
        inFlight -= 1
        if (n % 3 === 0) throw new ApiError({ message: 'x', status: 404 })
      },
      { concurrency: 3, onProgress: ({ done }) => progress.push(done) }
    )
    expect(peak).toBe(3)
    expect(result.map((o) => o.item)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(result.filter((o) => o.error).map((o) => o.item)).toEqual([3, 6])
    expect(progress).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('stops sending after an expired session, failing the rest unsent', async () => {
    const sent: number[] = []
    const result = await runBulk(
      [1, 2, 3, 4],
      async (n) => {
        sent.push(n)
        if (n === 1) throw new ApiError({ message: 'x', status: 401 })
      },
      { concurrency: 1 }
    )
    expect(sent).toEqual([1])
    expect(result.every((o) => o.error?.status === 401)).toBe(true)
  })

  it('wraps a non-API failure', async () => {
    const [outcome] = await runBulk([1], async () => {
      throw new Error('boom')
    })
    expect(outcome?.error).toBeInstanceOf(ApiError)
  })
})

describe('chunk', () => {
  it('splits into requests of at most the size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 100)).toEqual([])
  })
})
