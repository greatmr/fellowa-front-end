import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { maxWidth, spacing } from '../../../tailwind.config'
import { StudioPage, type StudioPageWidth } from './studio-page'

function container() {
  const element = screen.getByText('body').parentElement
  if (!element) throw new Error('no container')
  return element
}

describe('StudioPage', () => {
  it('defaults to the 64rem page width, centred, with the shared gutter', () => {
    render(
      <StudioPage>
        <p>body</p>
      </StudioPage>
    )
    const element = container()
    expect(element).toHaveAttribute('data-width', 'default')
    expect(element).toHaveClass(
      'mx-auto',
      'w-full',
      'max-w-page-default',
      'px-gutter',
      'sm:px-gutter-wide'
    )
    expect(element.className).not.toMatch(/\b(pl|pr|ml|mr)-/)
  })

  it.each<[StudioPageWidth, string]>([
    ['narrow', 'max-w-page-narrow'],
    ['medium', 'max-w-page-medium'],
    ['default', 'max-w-page-default'],
    ['wide', 'max-w-page-wide'],
  ])('maps width %s to %s and nothing else', (width, expected) => {
    render(
      <StudioPage width={width}>
        <p>body</p>
      </StudioPage>
    )
    const widths = container()
      .className.split(' ')
      .filter((name) => name.startsWith('max-w-'))
    expect(widths).toEqual([expected])
  })

  it('lets a caller class win over the gutter without duplicating it', () => {
    render(
      <StudioPage className="px-0">
        <p>body</p>
      </StudioPage>
    )
    const element = container()
    expect(element).toHaveClass('px-0')
    expect(element).not.toHaveClass('px-gutter')
  })

  it('has the design widths and gutter as tokens (presentation d843c3b)', () => {
    expect(maxWidth['page-narrow']).toBe('48rem') // Settings max-w-3xl
    expect(maxWidth['page-medium']).toBe('56rem') // Dashboard max-w-4xl
    expect(maxWidth['page-default']).toBe('64rem') // Posts, Explore max-w-5xl
    expect(maxWidth['page-wide']).toBe('72rem') // Tiers max-w-6xl
    expect(spacing.gutter).toBe('1rem') // px-4
    expect(spacing['gutter-wide']).toBe('1.5rem') // sm:px-6
  })
})
