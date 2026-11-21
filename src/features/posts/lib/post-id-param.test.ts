import { describe, expect, it } from 'vitest'

import { parsePostIdParam } from './post-id-param'

describe('parsePostIdParam', () => {
  it('takes a plain positive integer', () => {
    expect(parsePostIdParam('12')).toBe(12)
  })

  it.each(['0', '-1', '012', '1e3', '1.5', ' 1', 'abc', '99999999999999999'])(
    'refuses %s',
    (value) => expect(parsePostIdParam(value)).toBe(null)
  )
})
