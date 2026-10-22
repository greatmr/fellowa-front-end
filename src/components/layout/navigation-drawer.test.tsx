import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NavigationDrawer } from './navigation-drawer'

function renderDrawer() {
  return render(
    <NavigationDrawer
      title="Main navigation"
      openLabel="Open menu"
      closeLabel="Close menu"
      desktopQuery="(min-width: 64rem)"
      triggerClassName="lg:hidden"
    >
      <a href="#content">Content</a>
      <button type="button">Other action</button>
    </NavigationDrawer>
  )
}

afterEach(() => vi.restoreAllMocks())

describe('NavigationDrawer', () => {
  it('opens a named modal, closes with Escape, and returns focus to its trigger', async () => {
    const user = userEvent.setup()
    renderDrawer()
    const trigger = screen.getByRole('button', { name: 'Open menu' })

    await user.click(trigger)
    expect(
      screen.getByRole('dialog', { name: 'Main navigation' })
    ).toBeVisible()
    await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(trigger).toHaveFocus()
  })

  it('closes for navigation but keeps the drawer open for other actions', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(screen.getByRole('button', { name: 'Other action' }))
    expect(screen.getByRole('dialog')).toBeVisible()

    await user.click(screen.getByRole('link', { name: 'Content' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
  })

  it('releases its modal when the viewport becomes desktop', async () => {
    const user = userEvent.setup()
    const media = Object.assign(new EventTarget(), {
      matches: false,
      media: '(min-width: 64rem)',
      onchange: null,
      addListener() {},
      removeListener() {},
    })
    vi.spyOn(window, 'matchMedia').mockReturnValue(media)
    renderDrawer()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    act(() => {
      const change = new Event('change')
      Object.defineProperty(change, 'matches', { value: true })
      media.dispatchEvent(change)
    })

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(document.body).not.toHaveStyle({ pointerEvents: 'none' })
  })
})
