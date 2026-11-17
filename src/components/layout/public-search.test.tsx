import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as I18nNavigation from '@/i18n/navigation'

import fa from '../../../messages/fa.json'
import { renderWithIntl } from '../../../test/render'
import { PublicSearch } from './public-search'

const push = vi.hoisted(() => vi.fn())
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nNavigation>()),
  useRouter: () => ({ push }),
}))

describe('PublicSearch', () => {
  beforeEach(() => push.mockClear())

  it('opens the public creator list with the trimmed query', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicSearch />)

    const input = screen.getByRole('textbox', {
      name: fa.publicLayout.searchLabel,
    })
    expect(input).toHaveAttribute(
      'placeholder',
      fa.publicLayout.searchPlaceholder
    )
    await user.type(input, '  sara {Enter}')

    expect(push).toHaveBeenCalledWith({
      pathname: '/creators',
      query: { q: 'sara' },
    })
  })

  it('opens the unfiltered list when the query is blank', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicSearch />)

    await user.type(screen.getByRole('textbox'), '   {Enter}')

    expect(push).toHaveBeenCalledWith('/creators')
  })

  it('shows a clear button only while there is text, and clearing refocuses', async () => {
    const user = userEvent.setup()
    renderWithIntl(<PublicSearch />)
    const input = screen.getByRole('textbox')
    const clear = screen.getByRole('button', {
      name: fa.publicLayout.searchClear,
      hidden: true,
    })

    expect(clear).toHaveClass('hidden')
    await user.type(input, 'ab')
    expect(clear).not.toHaveClass('hidden')

    await user.click(clear)
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
    expect(push).not.toHaveBeenCalled()
  })
})
