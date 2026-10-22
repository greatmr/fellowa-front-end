import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from '@/components/ui/button'
import { ApiError, toApiError } from '@/lib/api/errors'

describe('project base', () => {
  it('renders a ui component through the test setup', () => {
    render(<Button>سفارش</Button>)
    expect(screen.getByRole('button', { name: 'سفارش' })).toBeInTheDocument()
  })

  it('normalizes an unknown throw into an ApiError', () => {
    const error = toApiError(new Error('boom'))
    expect(error).toBeInstanceOf(ApiError)
    expect(error.messages).toEqual(['boom'])
    expect(error.isUnauthorized).toBe(false)
  })
})
