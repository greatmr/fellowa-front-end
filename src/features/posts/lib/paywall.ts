/**
 * The paywall divider in a plain-text body (FQ-30 (1)). The body is held as
 * the part before the divider and the part after it; the post's `text` is the
 * two joined with nothing between them, and `paywallPosition` is the length of
 * the first part in Unicode code points, the unit the server cuts in (Q-19).
 * `Array.from` walks a string by code point, so Persian letters count one each
 * and an emoji outside the Basic Multilingual Plane counts one, not two.
 */

export function codePointLength(value: string): number {
  return Array.from(value).length
}

export type BodyParts = { before: string; after: string }

/** Splits a stored body at its code-point offset; past the end keeps it all. */
export function splitAtCodePoint(text: string, position: number): BodyParts {
  const points = Array.from(text)
  return {
    before: points.slice(0, position).join(''),
    after: points.slice(position).join(''),
  }
}

/**
 * Splits a textarea's value at its caret, a UTF-16 index. A caret between the
 * two halves of a surrogate pair (only reachable programmatically) moves
 * before the pair, so neither part holds half a character.
 */
export function splitAtCaret(value: string, caret: number): BodyParts {
  let index = Math.max(0, Math.min(caret, value.length))
  const previous = value.charCodeAt(index - 1)
  if (index > 0 && previous >= 0xd800 && previous <= 0xdbff) index -= 1
  return { before: value.slice(0, index), after: value.slice(index) }
}
