import { describe, expect, it } from 'vitest'

import { ownPageHref, postReaderUrl, publicPageAddress } from './public-address'

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

describe('postReaderUrl', () => {
  it('is the reader address under the page (/creators/:id/posts/:postId)', () => {
    const { url } = publicPageAddress('https://fellowa.test/', 42)
    expect(postReaderUrl(url, 9)).toBe(
      'https://fellowa.test/creators/42/posts/9'
    )
  })

  it('has none without an absolute page address', () => {
    expect(postReaderUrl(null, 9)).toBeNull()
  })
})

describe('ownPageHref', () => {
  it('opens /creator for an account with an address, published or not', () => {
    // `/creator` previews an unpublished page (BE-LAND-10), so publication
    // no longer changes the link.
    expect(ownPageHref({ alias: 'sara' })).toBe('/creator')
  })

  it('has no item without an address', () => {
    expect(ownPageHref({ alias: null })).toBeUndefined()
  })
})
