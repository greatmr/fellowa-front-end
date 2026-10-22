import { createRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Textarea } from '@/components/ui/textarea'

describe('Textarea', () => {
  it('supports controlled multiline text and native length limits', async () => {
    const user = userEvent.setup()
    const ref = createRef<HTMLTextAreaElement>()

    function Biography() {
      const [value, setValue] = useState('')

      return (
        <>
          <label htmlFor="biography">Biography</label>
          <Textarea
            ref={ref}
            id="biography"
            value={value}
            maxLength={12}
            rows={4}
            onChange={(event) => setValue(event.target.value)}
            aria-describedby="biography-hint"
          />
          <p id="biography-hint">Introduce your work.</p>
          <output>{value.length} characters</output>
        </>
      )
    }

    render(<Biography />)
    const textarea = screen.getByRole('textbox', { name: 'Biography' })
    expect(ref.current).toBe(textarea)
    expect(textarea).toHaveAccessibleDescription('Introduce your work.')
    expect(textarea).toHaveAttribute('rows', '4')
    await user.type(textarea, 'Hello{Enter}World! More')
    expect(textarea).toHaveValue('Hello\nWorld!')
    expect(screen.getByRole('status')).toHaveTextContent('12 characters')
  })

  it('supports required validation, readOnly values, and disabled form exclusion', async () => {
    const user = userEvent.setup()
    render(
      <form aria-label="Profile">
        <Textarea aria-label="About" name="about" required />
        <Textarea
          aria-label="Existing biography"
          name="existing"
          defaultValue="Existing text"
          readOnly
        />
        <Textarea
          aria-label="Unavailable biography"
          name="unavailable"
          defaultValue="Unavailable text"
          disabled
        />
      </form>
    )

    const about = screen.getByRole('textbox', { name: 'About' })
    const existing = screen.getByRole('textbox', { name: 'Existing biography' })
    const disabled = screen.getByRole('textbox', {
      name: 'Unavailable biography',
    })
    expect(about).toBeRequired()
    expect(about).toBeInvalid()
    await user.type(about, 'New biography')
    expect(about).toBeValid()
    await user.type(existing, ' changed')
    await user.type(disabled, ' changed')
    expect(existing).toHaveValue('Existing text')
    expect(disabled).toBeDisabled()
    expect(disabled).toHaveValue('Unavailable text')
    const form = screen.getByRole<HTMLFormElement>('form', { name: 'Profile' })
    expect(Array.from(new FormData(form).entries())).toEqual([
      ['about', 'New biography'],
      ['existing', 'Existing text'],
    ])
  })
})
