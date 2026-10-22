import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

function Confirmation({ showCloseButton = true }) {
  return (
    <>
      <DialogTrigger>Review changes</DialogTrigger>
      <DialogContent closeLabel="بستن" showCloseButton={showCloseButton}>
        <DialogHeader>
          <DialogTitle>Publish this post?</DialogTitle>
          <DialogDescription>
            Members will be able to read it.
          </DialogDescription>
        </DialogHeader>
        <input aria-label="Post title" defaultValue="A new chapter" />
        <DialogFooter>
          <DialogClose>Keep editing</DialogClose>
          <button type="button">Publish</button>
        </DialogFooter>
      </DialogContent>
    </>
  )
}

describe('Dialog', () => {
  it('announces its title and description, traps focus, and restores it on Escape', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button>Outside action</button>
        <Dialog>
          <Confirmation />
        </Dialog>
      </>
    )

    const trigger = screen.getByRole('button', { name: 'Review changes' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Publish this post?' })
    expect(dialog).toHaveAccessibleDescription(
      'Members will be able to read it.'
    )
    const title = within(dialog).getByRole('textbox', { name: 'Post title' })
    const close = within(dialog).getByRole('button', { name: 'بستن' })
    expect(title).toHaveFocus()
    expect(screen.queryByText('Close')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Outside action' })).toBeNull()

    await user.tab({ shift: true })
    expect(close).toHaveFocus()
    await user.tab()
    expect(title).toHaveFocus()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Outside action' })).toBeEnabled()
    expect(document.body.style.pointerEvents).not.toBe('none')
  })

  it('supports controlled opening and an explicit close action when the icon is hidden', async () => {
    const user = userEvent.setup()
    function ControlledDialog() {
      const [open, setOpen] = useState(false)
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <Confirmation showCloseButton={false} />
        </Dialog>
      )
    }
    render(<ControlledDialog />)

    await user.click(screen.getByRole('button', { name: 'Review changes' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'بستن' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Review changes' })
      ).toHaveFocus()
    )
  })

  it('closes from the localized close button', async () => {
    const user = userEvent.setup()
    render(
      <Dialog defaultOpen>
        <Confirmation />
      </Dialog>
    )

    await user.click(screen.getByRole('button', { name: 'بستن' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.pointerEvents).not.toBe('none')
  })

  it('dismisses an outside pointer interaction and restores trigger focus', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <Confirmation />
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: 'Review changes' })
    await user.click(trigger)
    // The overlay has no semantic role; it is the actual outside pointer target.
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')
    expect(overlay).toBeInstanceOf(HTMLElement)
    if (!(overlay instanceof HTMLElement)) throw new Error('Missing overlay')
    await user.click(overlay)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
