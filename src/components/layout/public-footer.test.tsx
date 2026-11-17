import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type * as I18nNavigation from '@/i18n/navigation'

import en from '../../../messages/en.json'
import fa from '../../../messages/fa.json'
import { renderWithIntl } from '../../../test/render'
import { PublicFooter } from './public-footer'

// The footer's language switch reads the pathname; no app router in jsdom.
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nNavigation>()),
  usePathname: () => '/',
}))

describe('PublicFooter', () => {
  it('stays dark in both themes by scoping the dark tokens', () => {
    renderWithIntl(<PublicFooter />)

    expect(screen.getByRole('contentinfo')).toHaveClass('dark')
  })

  it.each([
    ['fa', fa.publicLayout, ['/#why', '/#features', '/auth', '/creators']],
    ['en', en.publicLayout, ['/#why', '/#features', '/auth', '/creators']],
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
