import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('preserves consumer status semantics, attributes, and ref', () => {
    const ref = createRef<HTMLSpanElement>()
    render(
      <Badge ref={ref} variant="money" role="status" aria-live="polite">
        Paid
      </Badge>
    )

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Paid')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(ref.current).toBe(status)
  })

  it('supports a keyboard-operable asChild link and composes click handlers', async () => {
    const user = userEvent.setup()
    const activations: string[] = []
    render(
      <Badge
        asChild
        variant="outline"
        onClick={() => activations.push('badge')}
      >
        <a href="#membership" onClick={() => activations.push('link')}>
          Membership
        </a>
      </Badge>
    )

    const link = screen.getByRole('link', { name: 'Membership' })
    expect(link).toHaveAttribute('href', '#membership')
    await user.tab()
    expect(link).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(activations).toEqual(['link', 'badge'])
  })
})
