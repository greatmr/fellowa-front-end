import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Label } from '@/components/ui/label'

describe('Label', () => {
  it('associates with an input by id and transfers focus when clicked', async () => {
    const user = userEvent.setup()
    const ref = createRef<HTMLLabelElement>()
    render(
      <>
        <Label ref={ref} htmlFor="creator-name">
          Creator name
        </Label>
        <input id="creator-name" />
      </>
    )

    const label = screen.getByText('Creator name')
    const input = screen.getByRole('textbox', { name: 'Creator name' })
    expect(ref.current).toBe(label)
    await user.click(label)
    expect(input).toHaveFocus()
  })

  it('labels a nested control while retaining native disabled behavior', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Label>
          <input type="checkbox" />
          Send notifications
        </Label>
        <Label htmlFor="disabled-notifications">
          Unavailable notifications
        </Label>
        <input id="disabled-notifications" type="checkbox" disabled />
      </>
    )

    const enabled = screen.getByRole('checkbox', { name: 'Send notifications' })
    await user.click(screen.getByText('Send notifications'))
    expect(enabled).toBeChecked()
    await user.click(screen.getByText('Unavailable notifications'))
    const disabled = screen.getByRole('checkbox', {
      name: 'Unavailable notifications',
    })
    expect(disabled).toBeDisabled()
    expect(disabled).not.toBeChecked()
  })
})
