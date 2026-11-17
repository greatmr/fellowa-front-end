import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as I18nNavigation from '@/i18n/navigation'

import en from '../../../messages/en.json'
import fa from '../../../messages/fa.json'
import { renderWithIntl } from '../../../test/render'
import { LanguageSwitch } from './language-switch'

const reload = vi.hoisted(() => vi.fn())
vi.mock('@/lib/hard-reload', () => ({ hardReload: reload }))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nNavigation>()),
  usePathname: () => '/creators',
}))

describe('LanguageSwitch (FE-I18N-01)', () => {
  beforeEach(() => {
    reload.mockClear()
    window.history.replaceState(null, '', '/creators?q=sara&category=2#top')
  })

  it.each([
    ['fa', fa.language.label, 'فارسی'],
    ['en', en.language.label, 'English'],
  ] as const)('marks the current language in %s', (locale, label, name) => {
    renderWithIntl(<LanguageSwitch />, { locale })

    expect(screen.getByRole('group', { name: label })).toBeInTheDocument()
    expect(screen.getByRole('button', { name })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('names each language in itself', () => {
    renderWithIntl(<LanguageSwitch />)

    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
      'lang',
      'en'
    )
    expect(screen.getByRole('button', { name: 'فارسی' })).toHaveAttribute(
      'lang',
      'fa'
    )
  })

  it('reloads the same page through the prefix the proxy turns into the cookie', async () => {
    const user = userEvent.setup()
    renderWithIntl(<LanguageSwitch />)

    await user.click(screen.getByRole('button', { name: 'English' }))

    expect(reload).toHaveBeenCalledExactlyOnceWith(
      '/en/creators?q=sara&category=2#top'
    )
  })

  it('switches back to Persian the same way', async () => {
    const user = userEvent.setup()
    renderWithIntl(<LanguageSwitch />, { locale: 'en' })

    await user.click(screen.getByRole('button', { name: 'فارسی' }))

    expect(reload).toHaveBeenCalledWith('/fa/creators?q=sara&category=2#top')
  })

  it('does nothing when the current language is chosen again', async () => {
    const user = userEvent.setup()
    renderWithIntl(<LanguageSwitch />, { locale: 'en' })

    await user.click(screen.getByRole('button', { name: 'English' }))

    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads only on activation, never on arrow keys', async () => {
    const user = userEvent.setup()
    renderWithIntl(<LanguageSwitch />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'فارسی' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}{ArrowRight}')
    expect(reload).not.toHaveBeenCalled()

    await user.tab()
    expect(screen.getByRole('button', { name: 'English' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('ignores further clicks while loading, and recovers on a back-forward restore', async () => {
    const user = userEvent.setup()
    renderWithIntl(<LanguageSwitch />)

    await user.click(screen.getByRole('button', { name: 'English' }))
    await user.click(screen.getByRole('button', { name: 'English' }))
    expect(reload).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('group')).toHaveAttribute('aria-busy', 'true')

    act(() => {
      const event = new Event('pageshow') as PageTransitionEvent
      Object.defineProperty(event, 'persisted', { value: true })
      window.dispatchEvent(event)
    })
    expect(screen.getByRole('group')).not.toHaveAttribute('aria-busy')
    await user.click(screen.getByRole('button', { name: 'English' }))
    expect(reload).toHaveBeenCalledTimes(2)
  })
})
