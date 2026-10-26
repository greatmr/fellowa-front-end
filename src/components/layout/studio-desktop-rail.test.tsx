import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'

import en from '../../../messages/en.json'
import fa from '../../../messages/fa.json'
import { StudioDesktopRail } from './studio-desktop-rail'
import { StudioNavGroup } from './studio-nav-group'

describe('StudioDesktopRail', () => {
  it.each([
    { locale: 'en', messages: en },
    { locale: 'fa', messages: fa },
  ])(
    'collapses and expands with a localized accessible control in $locale',
    async ({ locale, messages }) => {
      const user = userEvent.setup()
      render(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <StudioDesktopRail>
            <nav aria-label={messages.studio.mainNav}>
              <a href="#dashboard">{messages.studio.nav.dashboard}</a>
            </nav>
          </StudioDesktopRail>
        </NextIntlClientProvider>
      )

      const collapse = screen.getByRole('button', {
        name: messages.studio.collapseSidebar,
      })
      expect(collapse).toHaveAttribute('aria-expanded', 'true')
      await user.click(collapse)
      const expand = screen.getByRole('button', {
        name: messages.studio.expandSidebar,
      })
      expect(expand).toHaveAttribute('aria-expanded', 'false')
      expect(
        screen.getByRole('link', { name: messages.studio.nav.dashboard })
      ).toBeInTheDocument()
      await user.click(expand)
      expect(
        screen.getByRole('button', { name: messages.studio.collapseSidebar })
      ).toHaveAttribute('aria-expanded', 'true')
    }
  )

  it('animates a category disclosure and keeps its links visible in the collapsed rail', async () => {
    const user = userEvent.setup()
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <StudioDesktopRail>
          <StudioNavGroup label={en.studio.groups.monetization}>
            <a href="#tiers">{en.studio.nav.tiers}</a>
          </StudioNavGroup>
        </StudioDesktopRail>
      </NextIntlClientProvider>
    )

    const group = screen.getByRole('button', {
      name: en.studio.groups.monetization,
    })
    await user.click(group)
    expect(group).toHaveAttribute('aria-expanded', 'false')
    const content = document.getElementById(
      group.getAttribute('aria-controls') ?? ''
    )
    expect(content).toHaveAttribute('inert')
    expect(content).toHaveClass('grid-rows-[0fr]')

    await user.click(
      screen.getByRole('button', { name: en.studio.collapseSidebar })
    )
    expect(content).not.toHaveAttribute('inert')
    expect(content).toHaveClass('grid-rows-[1fr]')
    await user.click(
      screen.getByRole('button', { name: en.studio.expandSidebar })
    )
    expect(content).toHaveAttribute('inert')
  })
})
