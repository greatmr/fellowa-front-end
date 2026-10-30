import { createRef, useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

describe('Card', () => {
  it('lifts on hover only when it is interactive', () => {
    render(
      <>
        <Card data-testid="static" />
        <Card data-testid="interactive" interactive className="shadow-sm" />
      </>
    )

    expect(screen.getByTestId('static')).not.toHaveClass('card-tactile')
    expect(screen.getByTestId('interactive')).toHaveClass(
      'card-tactile',
      'cursor-pointer',
      'shadow-sm'
    )
    expect(screen.getByTestId('interactive')).not.toHaveAttribute('interactive')
  })

  it('composes a named region with a description and working header/footer actions', async () => {
    const user = userEvent.setup()

    function ProfileCard() {
      const [status, setStatus] = useState('Draft')

      return (
        <Card
          role="region"
          aria-labelledby="profile-title"
          aria-describedby="profile-description"
        >
          <CardHeader>
            <CardTitle id="profile-title" role="heading" aria-level={2}>
              Creator profile
            </CardTitle>
            <CardDescription id="profile-description">
              Manage your public profile.
            </CardDescription>
            <CardAction>
              <button onClick={() => setStatus('Editing')}>Edit</button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <output>{status}</output>
          </CardContent>
          <CardFooter>
            <button onClick={() => setStatus('Saved')}>Save</button>
          </CardFooter>
        </Card>
      )
    }

    render(<ProfileCard />)
    const card = screen.getByRole('region', { name: 'Creator profile' })
    expect(card).toHaveAccessibleDescription('Manage your public profile.')
    expect(
      within(card).getByRole('heading', { level: 2, name: 'Creator profile' })
    ).toBeInTheDocument()
    await user.click(within(card).getByRole('button', { name: 'Edit' }))
    expect(within(card).getByRole('status')).toHaveTextContent('Editing')
    await user.click(within(card).getByRole('button', { name: 'Save' }))
    expect(within(card).getByRole('status')).toHaveTextContent('Saved')
  })

  it('forwards content refs and DOM props so callers can move focus after an action', async () => {
    const user = userEvent.setup()
    const ref = createRef<HTMLDivElement>()
    render(
      <Card>
        <CardHeader>
          <button onClick={() => ref.current?.focus()}>Review content</button>
        </CardHeader>
        <CardContent ref={ref} role="group" aria-label="Content" tabIndex={-1}>
          Review before publishing.
        </CardContent>
      </Card>
    )

    await user.click(screen.getByRole('button', { name: 'Review content' }))
    expect(screen.getByRole('group', { name: 'Content' })).toHaveFocus()
  })
})
