import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton', () => {
  it('preserves consumer loading semantics, content, and refs', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Skeleton ref={ref} role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading profile</span>
      </Skeleton>
    )

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Loading profile')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(ref.current).toBe(status)
  })

  it('allows decorative placeholders to stay hidden from assistive technology', () => {
    render(
      <Skeleton
        role="img"
        aria-label="Profile placeholder"
        aria-hidden="true"
      />
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { hidden: true })).toHaveAttribute(
      'aria-hidden',
      'true'
    )
  })
})
