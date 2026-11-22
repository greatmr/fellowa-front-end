import { describe, expect, it } from 'vitest'

import {
  addressStepStandsAlone,
  afterAccountDestination,
  choosesPageAddress,
  googleSignInDestination,
  phoneSignInDestination,
  requestedReturnTo,
  returnsToPage,
  safeReturnTo,
} from './return-to'

describe('safeReturnTo', () => {
  it.each([
    '/dashboard',
    '/posts/new',
    '/memberships',
    '/settings',
    '/creator',
  ])('accepts existing private route %s', (path) =>
    expect(safeReturnTo(path)).toBe(path)
  )

  it.each([
    ['/studio', '/dashboard'],
    ['/studio/posts/new', '/posts/new'],
    ['/en/studio/tiers', '/tiers'],
    ['/studio/page', '/dashboard'],
  ])('maps the retired %s to its current address (FE-SHELL-05)', (path, to) =>
    expect(safeReturnTo(path)).toBe(to)
  )

  it('accepts the own page /creator with a locale prefix (BE-LAND-10)', () => {
    expect(safeReturnTo('/fa/creator')).toBe('/creator')
    expect(returnsToPage('/creator')).toBe(true)
  })

  it('no longer accepts the retired /onboarding (FE-ONB-02)', () => {
    expect(safeReturnTo('/onboarding')).toBe('/dashboard')
  })

  it.each(['/en/tiers', '/fa/tiers'])(
    'canonicalizes locale-prefixed %s',
    (path) => expect(safeReturnTo(path)).toBe('/tiers')
  )

  it.each([
    null,
    ['https://attacker.example'],
    'https://attacker.example',
    '//attacker.example',
    '/\\attacker.example',
    '/%2f%2fattacker.example',
    '/dashboard/%2e%2e/auth/login',
    '/dashboard/../auth/login',
    '/dashboard?next=https://attacker.example',
    '/dashboard#fragment',
    '/dashboard\n',
    '/dashboard\u0000',
    '/auth/login',
    '/creator/example',
    '/dashboard/not-implemented',
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
    '/creators/12/posts',
    '/creators/12/posts/',
    '/creators/12/posts/0',
    '/creators/12/posts/07',
    '/creators/12/posts/5?x=1',
    '/creators/12/posts/5/edit',
    '/creators/12/posts/12345678901',
  ])('falls back for unsafe or unknown destination %j', (path) => {
    expect(safeReturnTo(path)).toBe('/dashboard')
  })

  it.each([
    ['/creators/12', '/creators/12'],
    ['/fa/creators/7', '/creators/7'],
    ['/en/creators/4', '/creators/4'],
    ['/creators/4/posts/31', '/creators/4/posts/31'],
    ['/fa/creators/4/posts/31', '/creators/4/posts/31'],
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
    [{ isNewUser: false, needsProfile: false }, '//evil.example', '/dashboard'],
    [{ isNewUser: false, needsProfile: false }, undefined, '/dashboard'],
  ])('%o with returnTo %s → %s', (result, returnTo, expected) => {
    expect(phoneSignInDestination(result, returnTo)).toEqual(expected)
  })
})

describe('requestedReturnTo', () => {
  it.each([
    [undefined, undefined],
    [['/settings'], undefined],
    ['/creators/5', '/creators/5'],
    ['//evil.example', '/dashboard'],
  ])('%j → %j', (value, expected) => {
    expect(requestedReturnTo(value)).toBe(expected)
  })
})

describe('after the account step (FQ-17)', () => {
  const newAccount = { alias: null }
  it.each([
    // No destination asked for, or the dashboard: choose the page address.
    [newAccount, undefined, '/auth/url', true],
    [
      newAccount,
      '/dashboard',
      // The default destination does not travel: a returnTo on /auth/url
      // means it was opened outside sign-up (FE-ONB-02).
      '/auth/url',
      true,
    ],
    // Started from a page: straight back to it.
    [newAccount, '/creators/5', '/creators/5', false],
    [newAccount, '/memberships', '/memberships', false],
    // Already has a page: nothing to choose.
    [{ alias: 'sara' }, undefined, '/dashboard', false],
  ])('%o with returnTo %s → %j', (user, returnTo, expected, choosesAddress) => {
    expect(afterAccountDestination(user, returnTo)).toEqual(expected)
    expect(choosesPageAddress(user, returnTo)).toBe(choosesAddress)
  })

  it('treats the address step as standalone only when opened with a returnTo (FE-ONB-02)', () => {
    expect(addressStepStandsAlone(undefined)).toBe(false)
    expect(addressStepStandsAlone('/settings')).toBe(true)
    expect(addressStepStandsAlone('/dashboard')).toBe(true)
  })

  it('only a non-dashboard destination counts as a page to return to', () => {
    expect(returnsToPage(undefined)).toBe(false)
    expect(returnsToPage('/dashboard')).toBe(false)
    expect(returnsToPage('//evil.example')).toBe(false)
    expect(returnsToPage('/creators/9')).toBe(true)
  })
})

describe('after a Google sign-in (FE-AUTH-05, FE-AUTH-06)', () => {
  const created = { isNewUser: true, needsProfile: false }
  const returning = { isNewUser: false, needsProfile: false }
  const unnamedNew = { isNewUser: true, needsProfile: true }
  const unnamedReturning = { isNewUser: false, needsProfile: true }
  it.each([
    // A new account chooses its page address, keeping the destination.
    [created, undefined, '/auth/url'],
    [
      created,
      '/dashboard',
      // The default destination does not travel: a returnTo on /auth/url
      // means it was opened outside sign-up (FE-ONB-02).
      '/auth/url',
    ],
    // Started from a page: straight back to it (FQ-17).
    [created, '/creators/5', '/creators/5'],
    // A returning account goes on, with or without a page.
    [returning, undefined, '/dashboard'],
    [returning, '/creators/5', '/creators/5'],
    [returning, '//evil.example', '/dashboard'],
    // No usable name from Google: the account step first, as for phone.
    [unnamedNew, undefined, '/auth/account'],
    [
      unnamedNew,
      '/dashboard',
      { pathname: '/auth/account', query: { returnTo: '/dashboard' } },
    ],
    [
      unnamedNew,
      '/creators/5',
      { pathname: '/auth/account', query: { returnTo: '/creators/5' } },
    ],
    [unnamedReturning, undefined, '/auth/account'],
  ])('%o with returnTo %s → %j', (result, returnTo, expected) => {
    expect(googleSignInDestination(result, returnTo)).toEqual(expected)
  })
})
