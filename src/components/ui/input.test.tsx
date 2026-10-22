import { createRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('supports controlled edits, labels, descriptions, and ref forwarding', async () => {
    const user = userEvent.setup()
    const ref = createRef<HTMLInputElement>()

    function ProfileName() {
      const [name, setName] = useState('')

      return (
        <>
          <label htmlFor="display-name">Display name</label>
          <Input
            ref={ref}
            id="display-name"
            name="displayName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-describedby="name-hint"
          />
          <p id="name-hint">Shown on your profile.</p>
          <output>{name}</output>
        </>
      )
    }

    render(<ProfileName />)
    const input = screen.getByRole('textbox', { name: 'Display name' })
    expect(ref.current).toBe(input)
    expect(input).toHaveAccessibleDescription('Shown on your profile.')
    await user.click(screen.getByText('Display name'))
    expect(input).toHaveFocus()
    await user.type(input, 'Sara')
    expect(input).toHaveValue('Sara')
    expect(screen.getByRole('status')).toHaveTextContent('Sara')
  })

  it('preserves native validation and serializes only successful form controls', async () => {
    const user = userEvent.setup()
    render(
      <form aria-label="Contact">
        <Input aria-label="Email" type="email" name="email" required />
        <Input
          aria-label="Account"
          name="account"
          defaultValue="creator"
          readOnly
        />
        <Input
          aria-label="Unavailable"
          name="unavailable"
          defaultValue="private"
          disabled
        />
      </form>
    )

    const email = screen.getByRole('textbox', { name: 'Email' })
    const account = screen.getByRole('textbox', { name: 'Account' })
    const disabled = screen.getByRole('textbox', { name: 'Unavailable' })
    const form = screen.getByRole<HTMLFormElement>('form', { name: 'Contact' })
    expect(email).toBeRequired()
    expect(email).toBeInvalid()
    await user.type(email, 'invalid')
    expect(email).toBeInvalid()
    await user.clear(email)
    await user.type(email, 'sara@example.com')
    expect(email).toBeValid()
    await user.type(account, ' changed')
    await user.type(disabled, ' changed')
    expect(account).toHaveValue('creator')
    expect(disabled).toBeDisabled()
    expect(disabled).toHaveValue('private')
    expect(Array.from(new FormData(form).entries())).toEqual([
      ['email', 'sara@example.com'],
      ['account', 'creator'],
    ])
  })

  it('forwards file-input restrictions and exposes the selected file', async () => {
    const user = userEvent.setup()
    const portrait = new File(['portrait'], 'portrait.png', {
      type: 'image/png',
    })
    render(<Input aria-label="Portrait" type="file" accept="image/png" />)

    const input = screen.getByLabelText<HTMLInputElement>('Portrait')
    await user.upload(input, portrait)
    expect(input.files).toHaveLength(1)
    expect(input.files?.item(0)).toBe(portrait)
    expect(input).toHaveAttribute('accept', 'image/png')
  })
})
