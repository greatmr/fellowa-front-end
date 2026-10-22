import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { beforeEach, describe, expect, it } from 'vitest'

import { ThemeSwitch } from '@/components/common/theme-switch'
import fa from '../../../messages/fa.json'
import en from '../../../messages/en.json'
import { renderWithIntl } from '../../../test/render'

describe('ThemeSwitch', () => {
  beforeEach(() => {
    localStorage.removeItem('theme')
    document.documentElement.classList.remove('dark')
  })
  it('offers three labelled options and applies the chosen theme to <html>', () => {
    renderWithIntl(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <ThemeSwitch />
      </ThemeProvider>
    )

    const group = screen.getByRole('radiogroup', { name: fa.theme.label })
    expect(group).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: fa.theme.light })).toHaveAttribute(
      'aria-checked',
      'true'
    )

    fireEvent.click(screen.getByRole('radio', { name: fa.theme.dark }))

    expect(screen.getByRole('radio', { name: fa.theme.dark })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(document.documentElement).toHaveClass('dark')
  })

  it.each([
    { locale: 'en', messages: en, nextKey: '{ArrowRight}' },
    { locale: 'fa', messages: fa, nextKey: '{ArrowLeft}' },
  ] as const)(
    'uses roving focus and directional keyboard selection in $locale',
    async ({ locale, messages, nextKey }) => {
      const user = userEvent.setup()
      renderWithIntl(
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ThemeSwitch />
        </ThemeProvider>,
        { locale }
      )
      const light = screen.getByRole('radio', { name: messages.theme.light })
      const dark = screen.getByRole('radio', { name: messages.theme.dark })
      const system = screen.getByRole('radio', { name: messages.theme.system })
      await user.tab()
      expect(light).toHaveFocus()
      await user.keyboard(nextKey)
      expect(dark).toHaveFocus()
      expect(dark).toHaveAttribute('aria-checked', 'true')
      expect(dark).toHaveAttribute('tabindex', '0')
      expect(light).toHaveAttribute('tabindex', '-1')
      await user.keyboard('{End}')
      expect(system).toHaveFocus()
      expect(system).toHaveAttribute('aria-checked', 'true')
      await user.keyboard('{Home}')
      expect(light).toHaveFocus()
      expect(light).toHaveAttribute('aria-checked', 'true')
    }
  )

  it('labels multiple mounted switches independently and synchronizes their selection', async () => {
    const user = userEvent.setup()
    renderWithIntl(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <ThemeSwitch />
        <ThemeSwitch />
      </ThemeProvider>
    )
    const groups = screen.getAllByRole('radiogroup', { name: fa.theme.label })
    expect(groups[0].getAttribute('aria-labelledby')).not.toBe(
      groups[1].getAttribute('aria-labelledby')
    )
    await user.click(
      within(groups[0]).getByRole('radio', { name: fa.theme.dark })
    )
    expect(
      within(groups[1]).getByRole('radio', { name: fa.theme.dark })
    ).toHaveAttribute('aria-checked', 'true')
  })
})
