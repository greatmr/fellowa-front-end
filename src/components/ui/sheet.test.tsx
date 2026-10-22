import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

function Filters({ showCloseButton = true }) {
  return (
    <>
      <SheetTrigger>Open filters</SheetTrigger>
      <SheetContent closeLabel="بستن" showCloseButton={showCloseButton}>
        <SheetHeader>
          <SheetTitle>فیلترها</SheetTitle>
          <SheetDescription>Choose which posts to show.</SheetDescription>
        </SheetHeader>
        <input type="checkbox" aria-label="Members only" />
        <SheetFooter>
          <SheetClose>Apply filters</SheetClose>
        </SheetFooter>
      </SheetContent>
    </>
  )
}

describe('Sheet', () => {
  it('announces its content and preserves the localized close name and logical end default', () => {
    render(
      <Sheet defaultOpen>
        <Filters />
      </Sheet>
    )

    const sheet = screen.getByRole('dialog', { name: 'فیلترها' })
    expect(sheet).toHaveAccessibleDescription('Choose which posts to show.')
    expect(sheet).toHaveClass('end-0')
    expect(
      within(sheet).getByRole('button', { name: 'بستن' })
    ).toBeInTheDocument()
    expect(screen.queryByText('Close')).not.toBeInTheDocument()
  })

  it('traps keyboard focus and restores the trigger and page interaction on Escape', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button>Outside action</button>
        <Sheet>
          <Filters />
        </Sheet>
      </>
    )

    const trigger = screen.getByRole('button', { name: 'Open filters' })
    await user.click(trigger)
    const firstControl = screen.getByRole('checkbox', { name: 'Members only' })
    expect(firstControl).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Outside action' })).toBeNull()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'بستن' })).toHaveFocus()
    await user.tab()
    expect(firstControl).toHaveFocus()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Outside action' })).toBeEnabled()
    expect(document.body.style.pointerEvents).not.toBe('none')
  })

  it('updates controlled open state through a footer action without an icon close button', async () => {
    const user = userEvent.setup()
    function ControlledSheet() {
      const [open, setOpen] = useState(false)
      return (
        <Sheet open={open} onOpenChange={setOpen}>
          <Filters showCloseButton={false} />
        </Sheet>
      )
    }
    render(<ControlledSheet />)

    await user.click(screen.getByRole('button', { name: 'Open filters' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'بستن' })).toBeNull()
    await user.click(screen.getByRole('checkbox', { name: 'Members only' }))
    expect(screen.getByRole('checkbox', { name: 'Members only' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Open filters' })).toHaveFocus()
    )
  })

  it('closes through its localized close button', async () => {
    const user = userEvent.setup()
    render(
      <Sheet defaultOpen>
        <Filters />
      </Sheet>
    )

    await user.click(screen.getByRole('button', { name: 'بستن' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.pointerEvents).not.toBe('none')
  })

  it('dismisses from the overlay and releases the modal pointer lock', async () => {
    const user = userEvent.setup()
    render(
      <Sheet>
        <Filters />
      </Sheet>
    )

    const trigger = screen.getByRole('button', { name: 'Open filters' })
    await user.click(trigger)
    // The overlay has no semantic role; it is the actual outside pointer target.
    const overlay = document.querySelector('[data-slot="sheet-overlay"]')
    expect(overlay).toBeInstanceOf(HTMLElement)
    if (!(overlay instanceof HTMLElement)) throw new Error('Missing overlay')
    await user.click(overlay)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(document.body.style.pointerEvents).not.toBe('none')
  })
})
