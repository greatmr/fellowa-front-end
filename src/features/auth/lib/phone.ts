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
 * The entry field as it is typed (presentation `formatPhoneDisplay` @
 * 01fb04d), in Latin digits: a national number (`09…`) is grouped as
 * `0912 345 6789` as it grows; a whole international one (`+98…`, `0098…`,
 * `98…` with all 12 digits) becomes the same. Anything else keeps its digits
 * and a leading `+`, ungrouped: a bare `9…` is not given its `0`, because
 * `98912…` being typed passes through ten digits that would read as a
 * national number. The submitted value is always `normalizeIranianMobile` of
 * this, which still accepts a bare `9…`.
 */
export function formatPhoneInput(raw: string): string {
  const latin = toLatinDigits(raw)
  const digitsOnly = latin.replace(/\D/g, '')
  const plus = latin.trimStart().startsWith('+')
  if (!plus && /^0(?!0)/.test(digitsOnly)) {
    return phoneGroups(digitsOnly).join(' ')
  }
  const mobile = normalizeIranianMobile(latin)
  const international =
    plus || digitsOnly.startsWith('00') || /^989\d{9}$/.test(digitsOnly)
  if (mobile && international) return phoneGroups(mobile).join(' ')
  return `${plus ? '+' : ''}${digitsOnly}`
}

/** What the entry field's caret is placed by: digits in any script, and `+`. */
const SIGNIFICANT = /[\d۰-۹٠-٩+]/

/** How many digits (or `+`) come before `position` in `value`. */
export function significantBefore(value: string, position: number): number {
  let count = 0
  for (const char of value.slice(0, position)) {
    if (SIGNIFICANT.test(char)) count++
  }
  return count
}

/**
 * The caret position just after the `count`-th digit (or `+`) of `value`, so
 * a regrouped number keeps the caret beside the same digit.
 */
export function positionAfterSignificant(value: string, count: number) {
  if (count <= 0) return 0
  let seen = 0
  for (let index = 0; index < value.length; index++) {
    if (SIGNIFICANT.test(value.charAt(index)) && ++seen === count) {
      return index + 1
    }
  }
  return value.length
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
