import { describe, expect, it } from 'vitest'

import {
  afterAccountDestination,
  choosesPageAddress,
  phoneSignInDestination,
  requestedReturnTo,
  returnsToPage,
  safeReturnTo,
} from './return-to'

describe('safeReturnTo', () => {
  it.each([
    '/studio',
    '/studio/posts/new',
    '/memberships',
    '/settings',
    '/onboarding',
  ])('accepts existing private route %s', (path) =>
    expect(safeReturnTo(path)).toBe(path)
  )

  it.each(['/en/studio/tiers', '/fa/studio/tiers'])(
    'canonicalizes locale-prefixed %s',
    (path) => expect(safeReturnTo(path)).toBe('/studio/tiers')
  )

  it.each([
    null,
    ['https://attacker.example'],
    'https://attacker.example',
    '//attacker.example',
    '/\\attacker.example',
    '/%2f%2fattacker.example',
    '/studio/%2e%2e/auth/login',
    '/studio/../auth/login',
    '/studio?next=https://attacker.example',
    '/studio#fragment',
    '/studio\n',
    '/studio\u0000',
    '/auth/login',
    '/creator/example',
    '/studio/not-implemented',
    '/creators',
    '/creators/',
    '/creators/0',
    '/creators/012',
    '/creators/12/tiers',
    '/creators/12?next=https://attacker.example',
    '/creators/12#x',
    '/creators/1e3',
    '/creators/12345678901',
    '/de/creators/12',
    '//creators/12',
  ])('falls back for unsafe or unknown destination %j', (path) => {
    expect(safeReturnTo(path)).toBe('/studio')
  })

  it.each([
    ['/creators/12', '/creators/12'],
    ['/fa/creators/7', '/creators/7'],
    ['/en/creators/4', '/creators/4'],
  ])('returns to the public creator page %s (FE-PAGE-01)', (path, expected) =>
    expect(safeReturnTo(path)).toBe(expected)
  )
})

describe('phoneSignInDestination', () => {
  it.each([
    [
      { isNewUser: true, needsProfile: true },
      '/creators/5',
      { pathname: '/auth/account', query: { returnTo: '/creators/5' } },
    ],
    [{ isNewUser: false, needsProfile: true }, undefined, '/auth/account'],
    [{ isNewUser: false, needsProfile: false }, '/creators/5', '/creators/5'],
    [{ isNewUser: false, needsProfile: false }, '/settings', '/settings'],
    [{ isNewUser: false, needsProfile: false }, '//evil.example', '/studio'],
    [{ isNewUser: false, needsProfile: false }, undefined, '/studio'],
  ])('%o with returnTo %s → %s', (result, returnTo, expected) => {
    expect(phoneSignInDestination(result, returnTo)).toEqual(expected)
  })
})

describe('requestedReturnTo', () => {
  it.each([
    [undefined, undefined],
    [['/settings'], undefined],
    ['/creators/5', '/creators/5'],
    ['//evil.example', '/studio'],
  ])('%j → %j', (value, expected) => {
    expect(requestedReturnTo(value)).toBe(expected)
  })
})

describe('after the account step (FQ-17)', () => {
  const newAccount = { alias: null }
  it.each([
    // No destination asked for, or the studio: choose the page address.
    [newAccount, undefined, '/auth/url', true],
    [
      newAccount,
      '/studio',
      { pathname: '/auth/url', query: { returnTo: '/studio' } },
      true,
    ],
    // Started from a page: straight back to it.
    [newAccount, '/creators/5', '/creators/5', false],
    [newAccount, '/memberships', '/memberships', false],
    // Already has a page: nothing to choose.
    [{ alias: 'sara' }, undefined, '/studio', false],
  ])('%o with returnTo %s → %j', (user, returnTo, expected, choosesAddress) => {
    expect(afterAccountDestination(user, returnTo)).toEqual(expected)
    expect(choosesPageAddress(user, returnTo)).toBe(choosesAddress)
  })

  it('only a non-studio destination counts as a page to return to', () => {
    expect(returnsToPage(undefined)).toBe(false)
    expect(returnsToPage('/studio')).toBe(false)
    expect(returnsToPage('//evil.example')).toBe(false)
    expect(returnsToPage('/creators/9')).toBe(true)
  })
})
