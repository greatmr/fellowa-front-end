import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Separator } from '@/components/ui/separator'

describe('Separator', () => {
  it('is decorative by default without exposing a separator landmark', () => {
    const ref = createRef<HTMLDivElement>()
    render(<Separator ref={ref} />)

    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
    expect(ref.current).toHaveAttribute('role', 'none')
    expect(ref.current).toHaveAttribute('data-orientation', 'horizontal')
  })

  it('exposes named semantic separators with the requested orientation', () => {
    const { rerender } = render(
      <Separator decorative={false} orientation="vertical" aria-label="Tools" />
    )

    expect(screen.getByRole('separator', { name: 'Tools' })).toHaveAttribute(
      'aria-orientation',
      'vertical'
    )
    rerender(<Separator decorative={false} aria-label="Sections" />)
    const horizontal = screen.getByRole('separator', { name: 'Sections' })
    // Horizontal is the ARIA separator role's implicit orientation.
    expect(horizontal).not.toHaveAttribute('aria-orientation')
    expect(horizontal).toHaveAttribute('data-orientation', 'horizontal')
  })
})
