import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type * as Navigation from '@/i18n/navigation'

import en from '../../../messages/en.json'
import fa from '../../../messages/fa.json'
import { renderWithIntl } from '../../../test/render'
import { AppLayout } from './app-layout'

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof Navigation>()),
  usePathname: () => '/dashboard',
}))

/**
 * FE-SHELL-05: there is one account type and no mode, so the creator frame
 * names no "studio" — not in a link, not in its copy.
 */
describe('AppLayout navigation has no studio (FE-SHELL-05)', () => {
  it.each(['fa', 'en'] as const)(
    'links nowhere under /studio and says no "studio" in %s',
    (locale) => {
      const { container } = renderWithIntl(
        <AppLayout ownPageHref="/creator">
          <p>content</p>
        </AppLayout>,
        { locale, strict: true }
      )

      const hrefs = Array.from(container.querySelectorAll('a[href]')).map(
        (link) => link.getAttribute('href') ?? ''
      )
      expect(hrefs.length).toBeGreaterThan(0)
      for (const href of hrefs) expect(href).not.toMatch(/studio/i)
      expect(container.textContent).not.toMatch(/studio|استودیو/i)
      expect(hrefs).toContain('/dashboard')
      expect(hrefs).toContain('/posts/new')
    }
  )

  it('opens the creator\'s own public page from "View my page"', () => {
    renderWithIntl(<AppLayout ownPageHref="/creator">{null}</AppLayout>, {
      locale: 'en',
    })
    const navs = screen.getAllByRole('navigation', { name: en.panel.mainNav })
    for (const nav of navs) {
      expect(
        within(nav).getByRole('link', { name: en.panel.nav.page })
      ).toHaveAttribute('href', '/creator')
    }
  })

  it('leaves "View my page" out when the address is not known', () => {
    renderWithIntl(<AppLayout>{null}</AppLayout>)
    expect(
      screen.queryByRole('link', { name: fa.panel.nav.page })
    ).not.toBeInTheDocument()
  })
})
