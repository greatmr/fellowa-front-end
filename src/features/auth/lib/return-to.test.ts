import { describe, expect, it } from 'vitest'

import { safeReturnTo } from './return-to'

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
