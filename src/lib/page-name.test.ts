import { describe, expect, it } from 'vitest'

import { publicPageTitle } from './page-name'

describe('publicPageTitle (FQ-17)', () => {
  it('shows the page name when the owner gave one', () => {
    expect(publicPageTitle({ pageName: 'دانا', alias: 'dana' })).toEqual({
      name: 'دانا',
      initial: 'د',
      isAlias: false,
    })
  })

  it.each([null, '', '   '])(
    'falls back to @alias when the page name is %j',
    (pageName) => {
      expect(publicPageTitle({ pageName, alias: 'dana' })).toEqual({
        name: '@dana',
        initial: 'D',
        isAlias: true,
      })
    }
  )

  it('trims a stored name', () => {
    expect(publicPageTitle({ pageName: ' Dana ', alias: 'dana' })).toEqual(
      expect.objectContaining({ name: 'Dana' })
    )
  })

  it('has nothing to show with neither a name nor an alias', () => {
    expect(publicPageTitle({ pageName: null, alias: null })).toBeNull()
  })
})
