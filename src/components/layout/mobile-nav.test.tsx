import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { ThemeProvider } from 'next-themes'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as Navigation from '@/i18n/navigation'

import en from '../../../messages/en.json'
import { PublicMobileNav } from './public-mobile-nav'
import { StudioMobileNav } from './studio-mobile-nav'

const navigation = vi.hoisted(() => ({ pathname: '/' }))

// Keep the real locale-aware Link and drawer; only simulate the router's
// pathname update, as happens on Back or navigation outside the open drawer.
vi.mock('@/i18n/navigation', async (importOriginal) => {
  const original = await importOriginal<typeof Navigation>()
  return { ...original, usePathname: () => navigation.pathname }
})

beforeEach(() => {
  navigation.pathname = '/'
})

describe('mobile navigation route changes', () => {
  it.each([
    {
      frame: 'studio',
      initial: '/studio',
      next: '/studio/posts',
      openLabel: en.studio.openMenu,
    },
    {
      frame: 'public',
      initial: '/',
      next: '/studio',
      openLabel: en.publicLayout.openMenu,
    },
  ])(
    'closes the $frame drawer and releases the page on a route change',
    async ({ frame, initial, next, openLabel }) => {
      const user = userEvent.setup()
      const view = () => (
        <NextIntlClientProvider locale="en" messages={en}>
          <ThemeProvider attribute="class" defaultTheme="light">
            <button type="button">Outside action</button>
            {frame === 'studio' ? (
              <StudioMobileNav>
                <a href="#dashboard">Dashboard</a>
              </StudioMobileNav>
            ) : (
              <PublicMobileNav />
            )}
          </ThemeProvider>
        </NextIntlClientProvider>
      )
      navigation.pathname = initial
      const { rerender } = render(view())

      await user.click(screen.getByRole('button', { name: openLabel }))
      expect(screen.getByRole('dialog')).toBeVisible()

      navigation.pathname = next
      rerender(view())

      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
      expect(document.body).not.toHaveStyle({ pointerEvents: 'none' })
      const outsideAction = screen.getByRole('button', {
        name: 'Outside action',
      })
      await user.click(outsideAction)
      expect(outsideAction).toHaveFocus()

      // Returning to the previous path must not resurrect its open modal state.
      navigation.pathname = initial
      rerender(view())
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    }
  )
})
