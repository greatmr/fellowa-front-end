import { describe, expect, it } from 'vitest'

import { codePointLength, splitAtCaret, splitAtCodePoint } from './paywall'

describe('paywall offsets in code points (Q-19)', () => {
  it('counts Persian letters and an astral emoji as one each', () => {
    // "سلام" is 4 code points; "😀" is 1 code point but 2 UTF-16 units.
    expect(codePointLength('سلام😀')).toBe(5)
    expect('سلام😀'.length).toBe(6)
  })

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

  it('splits at a caret given in UTF-16 units, and the offset round-trips', () => {
    const value = 'خوش😀آمدی'
    // Caret after the emoji: 3 Persian letters + 2 units.
    const parts = splitAtCaret(value, 5)
    expect(parts).toEqual({ before: 'خوش😀', after: 'آمدی' })
    const position = codePointLength(parts.before)
    expect(position).toBe(4)
    expect(splitAtCodePoint(parts.before + parts.after, position)).toEqual(
      parts
    )
  })

  it('moves a caret inside a surrogate pair before the pair', () => {
    expect(splitAtCaret('a😀b', 2)).toEqual({ before: 'a', after: '😀b' })
  })

  it('clamps a caret outside the value', () => {
    expect(splitAtCaret('ab', 9)).toEqual({ before: 'ab', after: '' })
    expect(splitAtCaret('ab', -1)).toEqual({ before: '', after: 'ab' })
  })
})
