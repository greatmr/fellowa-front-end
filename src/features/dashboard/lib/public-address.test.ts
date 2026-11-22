import { describe, expect, it } from 'vitest'

import { publicPageAddress } from './public-address'

describe('publicPageAddress', () => {
  it('joins the origin and /creators/:id, without a doubled slash', () => {
    expect(publicPageAddress('https://fellowa.test//', 42)).toEqual({
      path: '/creators/42',
      url: 'https://fellowa.test/creators/42',
    })
  })

  it('has no absolute url without a configured origin', () => {
    expect(publicPageAddress(undefined, 42).url).toBeNull()
    expect(publicPageAddress('   ', 42).url).toBeNull()
    expect(publicPageAddress(undefined, 42).path).toBe('/creators/42')
  })
})
