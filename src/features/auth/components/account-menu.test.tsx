import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Toaster } from '@/components/ui/sonner'
import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'
import { AccountMenu } from './account-menu'
import { renderAuth } from './test-utils'

const mocked = vi.hoisted(() => ({
  replace: vi.fn(),
  actions: { logoutForHook: vi.fn() },
}))
vi.mock('@/features/auth/server/hook-actions', () => mocked.actions)
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRouter: () => ({ replace: mocked.replace }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.removeItem('theme')
  mocked.actions.logoutForHook.mockResolvedValue({ ok: true, data: null })
})

function renderMenu(locale: 'en' | 'fa' = 'en') {
  return renderAuth(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AccountMenu
        name="Aida Kiani"
        subtitle="@aida"
        initial="A"
        ownPageHref="/creator"
      />
      <Toaster />
    </ThemeProvider>,
    { locale }
  )
}

describe('AccountMenu', () => {
  it('shows the account and opens a menu with the design items', async () => {
    const user = userEvent.setup()
    renderMenu()

    const trigger = screen.getByRole('button', {
      name: 'Account menu for Aida Kiani',
    })
    expect(trigger).toHaveTextContent('Aida Kiani')
    expect(trigger).toHaveTextContent('@aida')
    await user.click(trigger)

    const menu = await screen.findByRole('menu')
    expect(
      within(menu).getByRole('menuitem', { name: en.panel.account.viewPage })
    ).toHaveAttribute('href', '/creator')
    expect(
      within(menu).getByRole('menuitem', {
        name: en.panel.account.memberships,
      })
    ).toHaveAttribute('href', '/memberships')
    expect(
      within(menu).getByRole('menuitem', { name: en.panel.account.settings })
    ).toHaveAttribute('href', '/settings')
    expect(
      within(menu).getByRole('menuitem', { name: en.panel.account.logout })
    ).toBeInTheDocument()
    // FE-SHELL-05: no menu item leads under the retired /studio prefix.
    for (const item of within(menu).getAllByRole('menuitem')) {
      expect(item.getAttribute('href') ?? '').not.toMatch(/studio/i)
    }
    // No sound toggle (removed upstream) and no support item without a destination.
    expect(within(menu).queryByRole('switch')).not.toBeInTheDocument()
  })

  it('leaves "View my page" out without the page address', async () => {
    const user = userEvent.setup()
    renderAuth(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AccountMenu name="Aida Kiani" initial="A" />
      </ThemeProvider>,
      { locale: 'en' }
    )
    await user.click(
      screen.getByRole('button', { name: 'Account menu for Aida Kiani' })
    )
    const menu = await screen.findByRole('menu')
    expect(
      within(menu).queryByRole('menuitem', { name: en.panel.account.viewPage })
    ).not.toBeInTheDocument()
  })

  it('switches the theme from the menu and stays open', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(
      screen.getByRole('button', { name: 'Account menu for Aida Kiani' })
    )
    const menu = await screen.findByRole('menu')
    await user.click(
      within(menu).getByRole('menuitemradio', { name: en.theme.dark })
    )
    expect(document.documentElement).toHaveClass('dark')
    expect(
      within(screen.getByRole('menu')).getByRole('menuitemradio', {
        name: en.theme.dark,
      })
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('signs out through the logout mutation', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(
      screen.getByRole('button', { name: 'Account menu for Aida Kiani' })
    )
    await user.click(
      await screen.findByRole('menuitem', { name: en.panel.account.logout })
    )
    await waitFor(() => expect(mocked.replace).toHaveBeenCalledWith('/auth'))
    expect(mocked.actions.logoutForHook).toHaveBeenCalledWith(undefined)
  })

  it('reports a failed sign-out and stays put', async () => {
    const user = userEvent.setup()
    mocked.actions.logoutForHook.mockResolvedValue({
      ok: false,
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
    })
    renderMenu()
    await user.click(
      screen.getByRole('button', { name: 'Account menu for Aida Kiani' })
    )
    await user.click(
      await screen.findByRole('menuitem', { name: en.panel.account.logout })
    )
    expect(
      await screen.findByText(en.auth.errors.unavailable)
    ).toBeInTheDocument()
    expect(mocked.replace).not.toHaveBeenCalled()
  })

  it('labels the menu in Persian', async () => {
    const user = userEvent.setup()
    renderMenu('fa')
    await user.click(
      screen.getByRole('button', {
        name: fa.panel.account.trigger.replace('{name}', 'Aida Kiani'),
      })
    )
    expect(
      await screen.findByRole('menuitem', {
        name: fa.panel.account.memberships,
      })
    ).toBeInTheDocument()
  })

  it('treats an already-ended session as signed out', async () => {
    const user = userEvent.setup()
    mocked.actions.logoutForHook.mockResolvedValue({
      ok: false,
      status: 401,
      code: 'UNAUTHORIZED',
    })
    renderMenu()
    await user.click(
      screen.getByRole('button', { name: 'Account menu for Aida Kiani' })
    )
    await user.click(
      await screen.findByRole('menuitem', { name: en.panel.account.logout })
    )
    await waitFor(() => expect(mocked.replace).toHaveBeenCalledWith('/auth'))
  })
})
