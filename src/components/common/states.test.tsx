import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Button } from '@/components/ui/button'
import fa from '../../../messages/fa.json'
import { renderWithIntl } from '../../../test/render'

describe('ErrorState', () => {
  it('falls back to the shared translated copy', () => {
    renderWithIntl(<ErrorState />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      fa.errors.unexpectedTitle
    )
    expect(screen.getByText(fa.errors.unexpectedBody)).toBeInTheDocument()
  })

  it('renders caller copy and a composed action', () => {
    renderWithIntl(
      <ErrorState
        title="T"
        description="D"
        action={<Button>{fa.common.retry}</Button>}
      />
    )
    expect(screen.getByText('T')).toBeInTheDocument()
    expect(
      screen.queryByText(fa.errors.unexpectedTitle)
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: fa.common.retry })
    ).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('omits the description and action when not given', () => {
    renderWithIntl(<EmptyState title="هنوز پستی نیست" />)
    expect(screen.getByText('هنوز پستی نیست')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
