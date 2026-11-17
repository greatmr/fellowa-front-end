import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import en from '../../../messages/en.json'
import fa from '../../../messages/fa.json'
import { renderWithIntl } from '../../../test/render'
import { PublicFooter } from './public-footer'

describe('PublicFooter', () => {
  it('stays dark in both themes by scoping the dark tokens', () => {
    renderWithIntl(<PublicFooter />)

    expect(screen.getByRole('contentinfo')).toHaveClass('dark')
  })

  it.each([
    ['fa', fa.publicLayout, ['/#why', '/#features', '/auth', '/creators']],
    [
      'en',
      en.publicLayout,
      ['/en#why', '/en#features', '/en/auth', '/en/creators'],
    ],
  ] as const)(
    'links the product column to real %s routes only',
    (locale, copy, expected) => {
      renderWithIntl(<PublicFooter />, { locale })

      const product = screen.getByRole('navigation', { name: copy.product })
      const hrefs = within(product)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))
      expect(hrefs).toEqual(expected)
      expect(screen.getByText(copy.tagline)).toBeInTheDocument()
      expect(screen.getByText(copy.copyright)).toBeInTheDocument()
    }
  )
})
