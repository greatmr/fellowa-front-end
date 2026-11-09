import { describe, expect, it } from 'vitest'

import { normalizeIranianMobile, phoneGroups, retryAfterSeconds } from './phone'

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
