import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AuthActions } from '@/features/auth/components/auth-actions'
import type * as I18nNavigation from '@/i18n/navigation'

import en from '../../../messages/en.json'
import fa from '../../../messages/fa.json'
import { renderWithIntl } from '../../../test/render'
import { PublicHeader } from './public-header'

const messages = { fa, en } as const
type Locale = keyof typeof messages

vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nNavigation>()),
  useRouter: () => ({ push: vi.fn() }),
}))

function renderHeader(locale: Locale, signedIn: boolean) {
  return renderWithIntl(
    <PublicHeader authNavigation={<AuthActions signedIn={signedIn} />} />,
    { locale, strict: true }
  )
}

const hrefs = (root: HTMLElement) =>
  within(root)
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'))

describe('PublicHeader (FE-LAND-03, presentation d843c3b)', () => {
  it.each(['fa', 'en'] as const)(
    'links why, features and creators in %s, with no menu drawer',
    (locale) => {
      const t = messages[locale].publicLayout
      renderHeader(locale, false)
      const nav = screen.getByRole('navigation', { name: t.mainNav })
      expect(
        within(nav)
          .getAllByRole('link')
          .map((l) => l.textContent)
      ).toEqual([t.why, t.features, t.creators])
      expect(hrefs(nav)).toEqual(['/#why', '/#features', '/creators'])
      // No drawer: nothing opens a dialog, and no panel link for visitors.
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /menu|منو|navigation|ناوبری/i })
      ).not.toBeInTheDocument()
      expect(screen.getByRole('banner')).not.toHaveTextContent(t.dashboard)
    }
  )

  it.each(['fa', 'en'] as const)(
    'offers sign in and the dark call to action to a visitor in %s',
    (locale) => {
      const t = messages[locale]
      renderHeader(locale, false)
      const login = screen.getByRole('link', { name: t.auth.nav.login })
      expect(login).toHaveAttribute('href', '/auth')
      const cta = screen.getByRole('link', {
        name: new RegExp(t.publicLayout.startCreator),
      })
      expect(cta).toHaveAttribute('href', '/auth')
      expect(cta).toHaveClass('bg-inverse', 'rounded-md')
      expect(cta).not.toHaveClass('shadow-brand')
      expect(
        screen.queryByRole('button', { name: t.auth.nav.logout })
      ).not.toBeInTheDocument()
    }
  )

  it.each(['fa', 'en'] as const)(
    'gives a signed-in owner one dark Dashboard button and no sign-out in %s',
    (locale) => {
      const t = messages[locale]
      renderHeader(locale, true)
      const dashboard = screen.getByRole('link', {
        name: t.publicLayout.dashboard,
      })
      expect(dashboard).toHaveAttribute('href', '/dashboard')
      expect(dashboard).toHaveClass('bg-inverse')
      expect(
        screen.queryByRole('link', { name: t.auth.nav.login })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: t.auth.nav.logout })
      ).not.toBeInTheDocument()
    }
  )

  it('keeps the search shortcut and a plain logo tile with no glyph', () => {
    renderHeader('fa', false)
    const search = screen.getAllByRole('link', {
      name: fa.publicLayout.searchLabel,
    })
    expect(search[0]).toHaveAttribute('href', '/creators')
    expect(search[0]).toHaveClass('rounded-md')
    const home = screen.getByRole('link', { name: fa.publicLayout.home })
    expect(home.querySelector('svg')).toBeNull()
  })

  it.each([
    [false, 'fa'],
    [true, 'fa'],
    [false, 'en'],
    [true, 'en'],
  ] as const)('never says studio (signed in: %s, %s)', (signedIn, locale) => {
    renderHeader(locale, signedIn)
    expect(screen.getByRole('banner').textContent ?? '').not.toMatch(
      /studio|استودیو|پنل/i
    )
  })
})
