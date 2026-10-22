import { useState } from 'react'
import { DirectionProvider } from '@radix-ui/react-direction'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/components/providers/app-providers'
import { renderWithIntl } from '../../../test/render'

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

describe('DropdownMenu', () => {
  it('allows an explicit direction to override the surrounding provider', async () => {
    const user = userEvent.setup()
    render(
      <DirectionProvider dir="rtl">
        <DropdownMenu dir="ltr">
          <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Edit</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </DirectionProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Actions' }))
    expect(await screen.findByRole('menu')).toHaveAttribute('dir', 'ltr')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens by keyboard, skips disabled actions, and restores focus after selection', async () => {
    const user = userEvent.setup()
    function Actions() {
      const [result, setResult] = useState('No action selected')
      return (
        <>
          <output aria-label="Selected action">{result}</output>
          <DropdownMenu>
            <DropdownMenuTrigger>Post actions</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup aria-label="Editing">
                <DropdownMenuLabel>Editing</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setResult('Edit')}>
                  Edit
                  <DropdownMenuShortcut aria-hidden>⌘E</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>Archive</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setResult('Delete')}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )
    }
    render(<Actions />)

    const trigger = screen.getByRole('button', { name: 'Post actions' })
    await user.tab()
    await user.keyboard('{ArrowDown}')
    expect(await screen.findByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus()
    expect(screen.getByRole('menuitem', { name: 'Archive' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    await user.keyboard('{ArrowDown}{Enter}')

    expect(
      screen.getByRole('status', { name: 'Selected action' })
    ).toHaveTextContent('Delete')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('keeps controlled checkbox and radio values when the menu reopens', async () => {
    const user = userEvent.setup()
    function Preferences() {
      const [checked, setChecked] = useState<boolean | 'indeterminate'>(
        'indeterminate'
      )
      const [density, setDensity] = useState('comfortable')
      return (
        <DropdownMenu>
          <DropdownMenuTrigger>View options</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              checked={checked}
              onCheckedChange={setChecked}
            >
              Show drafts
            </DropdownMenuCheckboxItem>
            <DropdownMenuRadioGroup
              value={density}
              onValueChange={setDensity}
              aria-label="Density"
            >
              <DropdownMenuRadioItem value="comfortable">
                Comfortable
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="compact">
                Compact
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="disabled" disabled>
                Unavailable density
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
    render(<Preferences />)

    const trigger = screen.getByRole('button', { name: 'View options' })
    await user.click(trigger)
    const checkbox = screen.getByRole('menuitemcheckbox', {
      name: 'Show drafts',
    })
    expect(checkbox).toHaveAttribute('aria-checked', 'mixed')
    await user.click(checkbox)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await user.click(trigger)
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Show drafts' })
    ).toBeChecked()
    expect(
      screen.getByRole('menuitemradio', { name: 'Comfortable' })
    ).toBeChecked()
    expect(
      screen.getByRole('menuitemradio', { name: 'Unavailable density' })
    ).toHaveAttribute('aria-disabled', 'true')
    await user.click(screen.getByRole('menuitemradio', { name: 'Compact' }))
    await user.click(trigger)
    expect(screen.getByRole('menuitemradio', { name: 'Compact' })).toBeChecked()
    expect(
      screen.getByRole('menuitemradio', { name: 'Comfortable' })
    ).not.toBeChecked()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it.each([
    {
      locale: 'en',
      direction: 'ltr',
      openKey: '{ArrowRight}',
      closeKey: '{ArrowLeft}',
    },
    {
      locale: 'fa',
      direction: 'rtl',
      openKey: '{ArrowLeft}',
      closeKey: '{ArrowRight}',
    },
  ] as const)(
    'inherits $direction and navigates a submenu in the reading direction',
    async ({ locale, direction, openKey, closeKey }) => {
      const user = userEvent.setup()
      renderWithIntl(
        <AppProviders>
          <DropdownMenu>
            <DropdownMenuTrigger>Share post</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Share with</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Copy link</DropdownMenuItem>
                  <DropdownMenuItem>Email</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </AppProviders>,
        { locale }
      )

      const trigger = screen.getByRole('button', { name: 'Share post' })
      await user.tab()
      await user.keyboard('{ArrowDown}')
      const parentMenu = await screen.findByRole('menu')
      expect(parentMenu).toHaveAttribute('dir', direction)
      const submenuTrigger = screen.getByRole('menuitem', {
        name: 'Share with',
      })
      expect(submenuTrigger).toHaveFocus()
      await user.keyboard(openKey)
      const submenu = await screen.findByRole('menu', { name: 'Share with' })
      expect(submenu).toHaveAttribute('dir', direction)
      expect(
        within(submenu).getByRole('menuitem', { name: 'Copy link' })
      ).toHaveFocus()
      await user.keyboard(closeKey)
      expect(screen.queryByRole('menu', { name: 'Share with' })).toBeNull()
      expect(submenuTrigger).toHaveFocus()
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      await waitFor(() => expect(trigger).toHaveFocus())
    }
  )

  it('supports a controlled open state and prevents opening a disabled trigger', async () => {
    const user = userEvent.setup()
    function Actions() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger>More actions</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Edit post</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger disabled>Unavailable menu</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Cannot select</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )
    }
    render(<Actions />)

    const disabled = screen.getByRole('button', { name: 'Unavailable menu' })
    expect(disabled).toBeDisabled()
    await user.click(disabled)
    expect(screen.queryByRole('menu')).toBeNull()
    const trigger = screen.getByRole('button', { name: 'More actions' })
    await user.click(trigger)
    expect(
      screen.getByRole('menuitem', { name: 'Edit post' })
    ).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
