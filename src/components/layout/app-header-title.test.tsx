import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as Navigation from '@/i18n/navigation'

import en from '../../../messages/en.json'
import fa from '../../../messages/fa.json'
import { renderWithIntl } from '../../../test/render'
import { AppHeaderTitle } from './app-header-title'

const navigation = vi.hoisted(() => ({ pathname: '/dashboard' }))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof Navigation>()),
  usePathname: () => navigation.pathname,
}))

beforeEach(() => {
  navigation.pathname = '/dashboard'
})

describe('AppHeaderTitle', () => {
  it('shows the current page as category / title in fa', () => {
    navigation.pathname = '/chats'
    renderWithIntl(<AppHeaderTitle />)
    expect(screen.getByText(fa.panel.pages.chats.category)).toBeInTheDocument()
    expect(screen.getByText(fa.panel.pages.chats.title)).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('names the composer, not the post list, on the new-post route in en', () => {
    navigation.pathname = '/posts/new'
    renderWithIntl(<AppHeaderTitle />, { locale: 'en' })
    expect(screen.getByText(en.panel.pages.composer.title)).toBeInTheDocument()
  })

  it('shows the dashboard by its title alone, with no "studio" category', () => {
    renderWithIntl(<AppHeaderTitle />)
    expect(screen.getByText(fa.panel.pages.dashboard.title)).toBeInTheDocument()
    expect(screen.queryByText('/')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/استودیو/)
  })

  it('falls back to the panel label on an unknown route', () => {
    navigation.pathname = '/dashboard/unknown'
    renderWithIntl(<AppHeaderTitle />, { locale: 'en' })
    expect(screen.getByText(en.panel.label)).toBeInTheDocument()
  })
})
