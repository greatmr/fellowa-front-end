import { describe, expect, it } from 'vitest'

import { ownPageHref, publicPageAddress } from './public-address'

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

describe('ownPageHref', () => {
  it('opens the public page only when it is published', () => {
    expect(ownPageHref({ id: 7, alias: 'sara', isPublish: true })).toBe(
      '/creators/7'
    )
  })

  it('goes to the dashboard while the page is unpublished, or the server did not say', () => {
    expect(ownPageHref({ id: 7, alias: 'sara', isPublish: false })).toBe(
      '/dashboard'
    )
    expect(ownPageHref({ id: 7, alias: 'sara' })).toBe('/dashboard')
  })

  it('has no item without an address', () => {
    expect(ownPageHref({ id: 7, alias: null, isPublish: true })).toBeUndefined()
  })
})
