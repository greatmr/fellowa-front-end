import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

type ProfileValues = { displayName: string; biography: string }

function ProfileForm({ onSave }: { onSave: (values: ProfileValues) => void }) {
  const form = useForm<ProfileValues>({
    defaultValues: { displayName: '', biography: '' },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <FormField
          control={form.control}
          name="displayName"
          rules={{ required: 'Enter your display name' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Your public name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="biography"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Biography</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Tell readers about yourself</FormDescription>
              <FormMessage>Optional</FormMessage>
            </FormItem>
          )}
        />
        <button type="submit">Save profile</button>
      </form>
    </Form>
  )
}

describe('Form', () => {
  it('associates unique field labels and descriptions without empty errors', () => {
    render(<ProfileForm onSave={() => {}} />)

    const name = screen.getByRole('textbox', { name: 'Display name' })
    const biography = screen.getByRole('textbox', { name: 'Biography' })
    expect(name.id).not.toBe(biography.id)
    expect(name).toHaveAccessibleDescription('Your public name')
    expect(biography).toHaveAccessibleDescription('Tell readers about yourself')
    expect(name).toHaveAttribute('aria-invalid', 'false')
    expect(
      screen.queryByText('Enter your display name')
    ).not.toBeInTheDocument()
    expect(screen.getByText('Optional')).toBeInTheDocument()
  })

  it('exposes validation, focuses the invalid field, and submits corrected values', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ProfileForm onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    const name = screen.getByRole('textbox', { name: 'Display name' })
    expect(
      await screen.findByText('Enter your display name')
    ).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAccessibleDescription(
      'Your public name Enter your display name'
    )
    expect(name).toHaveFocus()
    expect(onSave).not.toHaveBeenCalled()

    await user.type(name, 'Niloofar')
    await user.type(
      screen.getByRole('textbox', { name: 'Biography' }),
      'Writer'
    )
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0]?.[0]).toEqual({
      displayName: 'Niloofar',
      biography: 'Writer',
    })
    expect(name).toHaveAttribute('aria-invalid', 'false')
    expect(name).toHaveAccessibleDescription('Your public name')
    expect(
      screen.queryByText('Enter your display name')
    ).not.toBeInTheDocument()
  })

  it('keeps generated field ids unique across separate form instances', () => {
    render(
      <>
        <ProfileForm onSave={() => {}} />
        <ProfileForm onSave={() => {}} />
      </>
    )

    const inputs = screen.getAllByRole('textbox')
    expect(new Set(inputs.map((input) => input.id)).size).toBe(inputs.length)
    for (const input of inputs) {
      expect(input).toHaveAccessibleName()
      expect(input).toHaveAccessibleDescription()
    }
  })

  it('rejects a field hook outside a FormField with an actionable error', () => {
    function InvalidField() {
      useFormField()
      return null
    }

    function InvalidForm() {
      const form = useForm()
      return (
        <Form {...form}>
          <InvalidField />
        </Form>
      )
    }

    expect(() => render(<InvalidForm />)).toThrow(/within <FormField>/)
  })

  it('rejects a field hook outside the form provider with an actionable error', () => {
    function InvalidField() {
      useFormField()
      return null
    }

    expect(() => render(<InvalidField />)).toThrow(/within <Form>/)
  })

  it('rejects controls without a FormItem instead of generating undefined ids', () => {
    function InvalidForm() {
      const form = useForm({ defaultValues: { name: '' } })
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormControl>
                <Input {...field} aria-label="Name" />
              </FormControl>
            )}
          />
        </Form>
      )
    }

    expect(() => render(<InvalidForm />)).toThrow(/within <FormItem>/)
  })
})
