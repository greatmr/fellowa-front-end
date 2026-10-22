import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Checkbox } from '@/components/ui/checkbox'

describe('Checkbox', () => {
  it('moves from indeterminate to checked with Space and participates in a form', async () => {
    const user = userEvent.setup()

    function Consent() {
      const [checked, setChecked] = useState<boolean | 'indeterminate'>(
        'indeterminate'
      )

      return (
        <form aria-label="Consent">
          <Checkbox
            id="terms"
            name="terms"
            value="accepted"
            checked={checked}
            onCheckedChange={setChecked}
          />
          <label htmlFor="terms">Accept terms</label>
        </form>
      )
    }

    render(<Consent />)
    const control = screen.getByRole('checkbox', { name: 'Accept terms' })
    const form = screen.getByRole<HTMLFormElement>('form', { name: 'Consent' })

    expect(control).toBePartiallyChecked()
    expect(new FormData(form).has('terms')).toBe(false)
    await user.tab()
    expect(control).toHaveFocus()
    await user.keyboard(' ')
    expect(control).toBeChecked()
    expect(new FormData(form).get('terms')).toBe('accepted')
    await user.click(screen.getByText('Accept terms'))
    expect(control).not.toBeChecked()
    expect(new FormData(form).has('terms')).toBe(false)
  })

  it('supports defaultChecked and excludes a disabled value from form data', async () => {
    const user = userEvent.setup()
    render(
      <form aria-label="Preferences">
        <Checkbox aria-label="Optional" defaultChecked name="optional" />
        <Checkbox
          aria-label="Unavailable"
          defaultChecked
          disabled
          name="unavailable"
        />
      </form>
    )

    const optional = screen.getByRole('checkbox', { name: 'Optional' })
    const disabled = screen.getByRole('checkbox', { name: 'Unavailable' })
    const form = screen.getByRole<HTMLFormElement>('form', {
      name: 'Preferences',
    })
    expect(optional).toBeChecked()
    await user.click(optional)
    expect(optional).not.toBeChecked()
    await user.click(disabled)
    expect(disabled).toBeChecked()
    expect(disabled).toBeDisabled()
    expect(new FormData(form).has('unavailable')).toBe(false)
  })
})
