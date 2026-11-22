/**
 * The paywall of a `plain` body (FQ-30 (1), Q-19): `paywallPosition` is a
 * length in Unicode code points, the unit the server cuts in. `Array.from`
 * walks a string by code point, so Persian letters count one each and an
 * emoji outside the Basic Multilingual Plane counts one, not two. The rich
 * editor (FE-POST-03) uses it once, to convert a plain post on edit; `html`
 * bodies use a block index (`rich-body.ts`).
 */

export type BodyParts = { before: string; after: string }

/** Splits a stored body at its code-point offset; past the end keeps it all. */
export function splitAtCodePoint(text: string, position: number): BodyParts {
  const points = Array.from(text)
  return {
    before: points.slice(0, position).join(''),
    after: points.slice(position).join(''),
  }
}
