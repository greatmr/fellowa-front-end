import { describe, expect, it } from 'vitest'

import { safeReturnTo } from './return-to'

describe('safeReturnTo', () => {
  it.each(['/studio', '/studio/posts/new', '/memberships', '/settings'])(
    'accepts existing private route %s',
    (path) => expect(safeReturnTo(path)).toBe(path)
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
  ])('falls back for unsafe or unknown destination %j', (path) => {
    expect(safeReturnTo(path)).toBe('/studio')
  })
})
