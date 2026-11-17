import { describe, expect, it } from 'vitest'

import {
  formatPhoneInput,
  normalizeIranianMobile,
  phoneGroups,
  positionAfterSignificant,
  retryAfterSeconds,
  significantBefore,
} from './phone'

describe('normalizeIranianMobile (the backend phone-number.ts rules)', () => {
  it.each([
    ['09121234567', '09121234567'],
    ['۰۹۱۲۱۲۳۴۵۶۷', '09121234567'],
    ['٠٩١٢١٢٣٤٥٦٧', '09121234567'],
    ['+989121234567', '09121234567'],
    ['00989121234567', '09121234567'],
    ['989121234567', '09121234567'],
    ['9121234567', '09121234567'],
    ['0912 123 4567', '09121234567'],
    ['۰۹۱۲-۱۲۳-۴۵۶۷', '09121234567'],
    ['(0912) 123.4567', '09121234567'],
    ['‏+98 912 123 4567', '09121234567'],
  ])('%j → %s', (input, expected) => {
    expect(normalizeIranianMobile(input)).toBe(expected)
  })

  it.each([
    '',
    '0912123456',
    '091212345678',
    '02112345678',
    '+18005550100',
    'abc09121234567',
    '0'.repeat(33),
  ])('refuses %j', (input) => {
    expect(normalizeIranianMobile(input)).toBeNull()
  })
})

describe('phoneGroups', () => {
  it('groups as the prototype displays a number', () => {
    expect(phoneGroups('09121234567')).toEqual(['0912', '123', '4567'])
  })
})

describe('retryAfterSeconds', () => {
  it.each([
    ['A code was sent recently. Try again in 42 seconds', 42],
    ['Too many attempts. Try again in 900 seconds', 900],
    ['Try again in 1 second', 1],
  ])('reads %j', (message, seconds) => {
    expect(retryAfterSeconds(message)).toBe(seconds)
  })

  it.each([undefined, '', 'Rate limited'])('has none in %j', (message) => {
    expect(retryAfterSeconds(message)).toBeUndefined()
  })
})

describe('formatPhoneInput (presentation formatPhoneDisplay, FE-AUTH-06)', () => {
  it.each([
    ['', ''],
    ['0', '0'],
    ['0912', '0912'],
    ['09121', '0912 1'],
    ['0912123', '0912 123'],
    ['09121234', '0912 123 4'],
    ['09121234567', '0912 123 4567'],
    // Persian digits and separators are read, then shown in Latin here.
    ['۰۹۱۲ ۱۲۳ ۴۵۶۷', '0912 123 4567'],
    ['0912-123-4567', '0912 123 4567'],
    // A whole number in any form the API takes is regrouped.
    ['+989121234567', '0912 123 4567'],
    ['00989121234567', '0912 123 4567'],
    ['989121234567', '0912 123 4567'],
    // A bare 9… stays as typed; it is still sent as 09….
    ['9121234567', '9121234567'],
    // An international prefix being typed is not guessed at.
    ['+', '+'],
    ['+98', '+98'],
    ['+98 912', '+98912'],
    ['9891212345', '9891212345'],
    ['98912123456', '98912123456'],
    ['0098912', '0098912'],
    // Too long stays visible, so the field can say it is wrong.
    ['091212345678', '0912 123 45678'],
  ])('%j → %j', (raw, shown) => {
    expect(formatPhoneInput(raw)).toBe(shown)
  })

  it('never changes what is submitted', () => {
    for (const raw of ['+98 912 123 4567', '۰۹۱۲۱۲۳۴۵۶۷', '9121234567']) {
      expect(normalizeIranianMobile(formatPhoneInput(raw))).toBe(
        normalizeIranianMobile(raw)
      )
    }
  })
})

describe('caret helpers for the regrouped entry field', () => {
  it('counts digits in any script and +, never the group spaces', () => {
    expect(significantBefore('0912 123 4567', 6)).toBe(5)
    expect(significantBefore('۰۹۱۲ ۱۲۳', 8)).toBe(7)
    expect(significantBefore('+98912', 3)).toBe(3)
    expect(significantBefore('0912', 0)).toBe(0)
  })

  it('places the caret after the same digit once regrouped', () => {
    expect(positionAfterSignificant('0912 123 4567', 0)).toBe(0)
    expect(positionAfterSignificant('0912 123 4567', 4)).toBe(4)
    expect(positionAfterSignificant('0912 123 4567', 5)).toBe(6)
    expect(positionAfterSignificant('۰۹۱۲ ۱۲۳ ۴۵۶۷', 8)).toBe(10)
    expect(positionAfterSignificant('0912', 9)).toBe(4)
  })
})
