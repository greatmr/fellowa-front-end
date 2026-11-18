import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import * as icons from './app-icons'

describe('app icons', () => {
  const entries = Object.entries(icons).filter(
    (
      entry
    ): entry is [string, (props: icons.AppIconProps) => React.JSX.Element] =>
      typeof entry[1] === 'function'
  )

  it.each(entries)(
    '%s is decorative, sized by class and drawn in currentColor',
    (_, Icon) => {
      const { container } = render(<Icon className="size-4" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
      expect(svg).toHaveClass('size-4')
      expect(svg?.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i)
      for (const shape of svg?.querySelectorAll('path') ?? []) {
        const paint = shape.getAttribute('fill') ?? shape.getAttribute('stroke')
        expect(paint).toBe('currentColor')
      }
    }
  )

  it('mirrors the open-page arrow in LTR only', () => {
    const { container } = render(<icons.OpenPageIcon />)
    expect(container.querySelector('svg')).toHaveClass('ltr:-scale-x-100')
  })
})
