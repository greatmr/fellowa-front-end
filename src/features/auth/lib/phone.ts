import { toLatinDigits } from '@/lib/digits'

/** The one form the API stores and returns (BE-AUTH-08): `09` + 9 digits. */
export const IRANIAN_MOBILE = /^09\d{9}$/

/** The API's `@MaxLength(32)` on `phone`. */
export const PHONE_INPUT_MAX = 32

/** Spaces, dashes, dots, parentheses and the invisible marks a pasted RTL number carries. */
const SEPARATORS = /[\s\-().‌‎‏‪-‮]/g

/**
 * The client copy of the backend's `normalizeIranianMobile` (`phone-number.ts`),
 * so the form can refuse a number before a request: Persian and Arabic-Indic
 * digits, `+98`, `0098`, `98` and a bare `9…` all become `09XXXXXXXXX`. The
 * server normalises again and stays authoritative.
 */
export function normalizeIranianMobile(raw: string): string | null {
  if (raw.length > PHONE_INPUT_MAX) return null
  let value = toLatinDigits(raw).replace(SEPARATORS, '')

  if (value.startsWith('+98')) value = `0${value.slice(3)}`
  else if (value.startsWith('0098')) value = `0${value.slice(4)}`
  else if (/^989\d{9}$/.test(value)) value = `0${value.slice(2)}`
  else if (/^9\d{9}$/.test(value)) value = `0${value}`

  return IRANIAN_MOBILE.test(value) ? value : null
}

/** `09121234567` → `['0912', '123', '4567']`, the prototype's display grouping. */
export function phoneGroups(phone: string): string[] {
  return [phone.slice(0, 4), phone.slice(4, 7), phone.slice(7)].filter(Boolean)
}

/**
 * Seconds left in a `429` from the phone routes. The backend puts them only in
 * the message ("… Try again in 42 seconds"); `undefined` when absent.
 */
export function retryAfterSeconds(message: string | undefined) {
  const match = message?.match(/in (\d{1,6}) seconds?\b/)
  return match ? Number(match[1]) : undefined
}

/** A wait the server imposed, with the moment it was learned (epoch ms). */
export type Deadline = { until: number; setAt: number }

/** Call from an event handler: `seconds` from now. */
export function deadlineIn(seconds: number): Deadline {
  const setAt = Date.now()
  return { until: setAt + seconds * 1000, setAt }
}
