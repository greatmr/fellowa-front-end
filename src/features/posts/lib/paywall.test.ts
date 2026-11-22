import { describe, expect, it } from 'vitest'

import { splitAtCodePoint } from './paywall'

describe('plain paywall offsets in code points (Q-19)', () => {
  it('splits a stored body at its code-point offset, never inside an emoji', () => {
    expect(splitAtCodePoint('ab😀cd', 3)).toEqual({
      before: 'ab😀',
      after: 'cd',
    })
    expect(splitAtCodePoint('سلام دنیا', 4)).toEqual({
      before: 'سلام',
      after: ' دنیا',
    })
  })

  it('keeps the whole body before a position past its end', () => {
    expect(splitAtCodePoint('abc', 10)).toEqual({ before: 'abc', after: '' })
    expect(splitAtCodePoint('abc', 0)).toEqual({ before: '', after: 'abc' })
  })
})
