/**
 * The edit route's `[postId]`: a positive integer in its plain decimal form
 * (no sign, leading zero, exponent or space), as `ParseIntPipe` would take
 * and the id would be written; anything else is a 404 before any request.
 */
export function parsePostIdParam(value: string): number | null {
  if (!/^[1-9][0-9]{0,15}$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}
