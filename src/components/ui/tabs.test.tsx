import { useState } from 'react'
import { DirectionProvider } from '@radix-ui/react-direction'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/components/providers/app-providers'
import { renderWithIntl } from '../../../test/render'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function PreferenceTabs() {
  return (
    <>
      <TabsList aria-label="Preferences">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="billing" disabled>
          Billing
        </TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="privacy">Privacy</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">Public profile settings</TabsContent>
      <TabsContent value="billing">Billing settings</TabsContent>
      <TabsContent value="notifications">Notification settings</TabsContent>
      <TabsContent value="privacy">Privacy settings</TabsContent>
    </>
  )
}

describe('Tabs', () => {
  it('allows an explicit direction to override the surrounding provider', async () => {
    const user = userEvent.setup()
    render(
      <DirectionProvider dir="rtl">
        <Tabs dir="ltr" defaultValue="profile">
          <PreferenceTabs />
        </Tabs>
      </DirectionProvider>
    )

    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Notifications' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Notifications' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  it.each([
    { locale: 'en', direction: 'ltr', forward: '{ArrowRight}' },
    { locale: 'fa', direction: 'rtl', forward: '{ArrowLeft}' },
  ] as const)(
    'uses automatic keyboard activation and skips disabled tabs in $direction',
    async ({ locale, direction, forward }) => {
      const user = userEvent.setup()
      renderWithIntl(
        <AppProviders>
          <Tabs defaultValue="profile">
            <PreferenceTabs />
          </Tabs>
        </AppProviders>,
        { locale }
      )

      const profile = screen.getByRole('tab', { name: 'Profile' })
      const notifications = screen.getByRole('tab', { name: 'Notifications' })
      expect(
        screen.getByRole('tablist').closest('[data-slot="tabs"]')
      ).toHaveAttribute('dir', direction)
      expect(screen.getByRole('tab', { name: 'Billing' })).toBeDisabled()
      expect(profile).toHaveAttribute('aria-selected', 'true')
      expect(
        screen.getByRole('tabpanel', { name: 'Profile' })
      ).toHaveTextContent('Public profile settings')
      await user.tab()
      expect(profile).toHaveFocus()
      await user.keyboard(forward)

      expect(notifications).toHaveFocus()
      expect(notifications).toHaveAttribute('aria-selected', 'true')
      expect(
        screen.getByRole('tabpanel', { name: 'Notifications' })
      ).toHaveTextContent('Notification settings')
      expect(
        screen.queryByRole('tabpanel', { name: 'Profile' })
      ).not.toBeInTheDocument()
      await user.keyboard('{Home}')
      expect(profile).toHaveFocus()
      await user.keyboard('{End}')
      expect(screen.getByRole('tab', { name: 'Privacy' })).toHaveFocus()
    }
  )

  it('supports controlled selection with manual keyboard activation', async () => {
    const user = userEvent.setup()
    function Preferences() {
      const [value, setValue] = useState('profile')
      return (
        <Tabs value={value} onValueChange={setValue} activationMode="manual">
          <PreferenceTabs />
        </Tabs>
      )
    }
    render(<Preferences />)

    await user.tab()
    await user.keyboard('{ArrowRight}')
    const notifications = screen.getByRole('tab', { name: 'Notifications' })
    expect(notifications).toHaveFocus()
    expect(notifications).toHaveAttribute('aria-selected', 'false')
    expect(
      screen.getByRole('tabpanel', { name: 'Profile' })
    ).toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(notifications).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByRole('tabpanel', { name: 'Notifications' })
    ).toBeInTheDocument()
  })

  it('navigates vertical tabs with up and down keys and maintains panel relationships', async () => {
    const user = userEvent.setup()
    render(
      <Tabs defaultValue="profile" orientation="vertical">
        <PreferenceTabs />
      </Tabs>
    )

    expect(screen.getByRole('tablist')).toHaveAttribute(
      'aria-orientation',
      'vertical'
    )
    await user.tab()
    await user.keyboard('{ArrowDown}')
    const selected = screen.getByRole('tab', { name: 'Notifications' })
    const panel = screen.getByRole('tabpanel', { name: 'Notifications' })
    expect(selected).toHaveFocus()
    expect(selected).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveAttribute('aria-labelledby', selected.id)
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveFocus()
  })
})
