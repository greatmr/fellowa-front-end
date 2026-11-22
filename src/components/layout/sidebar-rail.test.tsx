import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'

import en from '../../../messages/en.json'
import fa from '../../../messages/fa.json'
import { SidebarRail, SidebarRailToggle } from './sidebar-rail'
import { NavGroup } from './nav-group'

describe('SidebarRail', () => {
  it.each([
    { locale: 'en', messages: en },
    { locale: 'fa', messages: fa },
  ])(
    'collapses and expands with a localized accessible control in $locale',
    async ({ locale, messages }) => {
      const user = userEvent.setup()
      render(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SidebarRail>
            <SidebarRailToggle />
            <nav aria-label={messages.studio.mainNav}>
              <a href="#dashboard">{messages.studio.nav.dashboard}</a>
            </nav>
          </SidebarRail>
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
        <SidebarRail>
          <SidebarRailToggle />
          <NavGroup label={en.studio.groups.monetization}>
            <a href="#tiers">{en.studio.nav.tiers}</a>
          </NavGroup>
        </SidebarRail>
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

  it('renders no collapse control outside the desktop rail (mobile drawer)', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SidebarRailToggle />
      </NextIntlClientProvider>
    )
    expect(
      screen.queryByRole('button', { name: en.studio.collapseSidebar })
    ).not.toBeInTheDocument()
  })
})
