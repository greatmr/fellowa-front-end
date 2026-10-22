import { createRef, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('forwards its ref and activates a native form with the keyboard', async () => {
    const user = userEvent.setup()
    const ref = createRef<HTMLButtonElement>()

    function PublishForm() {
      const [status, setStatus] = useState('Draft')

      return (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setStatus('Published')
          }}
        >
          <Button ref={ref} type="submit" name="intent" value="publish">
            Publish
          </Button>
          <output>{status}</output>
        </form>
      )
    }

    render(<PublishForm />)
    const button = screen.getByRole('button', { name: 'Publish' })
    expect(ref.current).toBe(button)
    expect(button).toHaveAttribute('name', 'intent')
    expect(button).toHaveAttribute('value', 'publish')
    await user.tab()
    expect(button).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Published')
  })

  it('keeps disabled actions inert and out of the tab order', async () => {
    const user = userEvent.setup()

    function Actions() {
      const [status, setStatus] = useState('Draft')

      return (
        <>
          <Button disabled onClick={() => setStatus('Deleted')}>
            Delete
          </Button>
          <Button type="button" onClick={() => setStatus('Saved')}>
            Save
          </Button>
          <output>{status}</output>
        </>
      )
    }

    render(<Actions />)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('status')).toHaveTextContent('Draft')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()
    await user.keyboard(' ')
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
  })

  it('composes an asChild link without nesting a button or losing handlers', async () => {
    const user = userEvent.setup()
    const ref = createRef<HTMLAnchorElement>()
    const activations: string[] = []

    render(
      <Button asChild variant="link" onClick={() => activations.push('parent')}>
        <a ref={ref} href="#profile" onClick={() => activations.push('child')}>
          View profile
        </a>
      </Button>
    )

    const link = screen.getByRole('link', { name: 'View profile' })
    expect(ref.current).toBe(link)
    expect(link).toHaveAttribute('href', '#profile')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(activations).toEqual(['child', 'parent'])
  })
})
