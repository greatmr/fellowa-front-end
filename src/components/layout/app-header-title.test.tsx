import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as Navigation from '@/i18n/navigation'

import en from '../../../messages/en.json'
import fa from '../../../messages/fa.json'
import { renderWithIntl } from '../../../test/render'
import { AppHeaderTitle } from './app-header-title'

const navigation = vi.hoisted(() => ({ pathname: '/studio' }))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof Navigation>()),
  usePathname: () => navigation.pathname,
}))

beforeEach(() => {
  navigation.pathname = '/studio'
})

describe('AppHeaderTitle', () => {
  it('shows the current page as category / title in fa', () => {
    navigation.pathname = '/chats'
    renderWithIntl(<AppHeaderTitle />)
    expect(screen.getByText(fa.studio.pages.chats.category)).toBeInTheDocument()
    expect(screen.getByText(fa.studio.pages.chats.title)).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('names the composer, not the post list, on the new-post route in en', () => {
    navigation.pathname = '/studio/posts/new'
    renderWithIntl(<AppHeaderTitle />, { locale: 'en' })
    expect(screen.getByText(en.studio.pages.composer.title)).toBeInTheDocument()
  })

  it('falls back to the studio label on an unknown route', () => {
    navigation.pathname = '/studio/unknown'
    renderWithIntl(<AppHeaderTitle />, { locale: 'en' })
    expect(screen.getByText(en.studio.label)).toBeInTheDocument()
  })
})
