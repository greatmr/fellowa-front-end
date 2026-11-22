import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type * as I18nNavigation from '@/i18n/navigation'
import { renderWithIntl } from '../../../../test/render'

vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.fellowa.test/api')
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fellowa.test/')

const mocks = vi.hoisted(() => ({ publish: vi.fn(), refresh: vi.fn() }))
vi.mock('@/features/dashboard/server/actions', () => ({
  publishPageAction: mocks.publish,
}))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nNavigation>()),
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { CreatorDashboard } = await import('./creator-dashboard')

describe('CreatorDashboard (FE-STUDIO-03)', () => {
  it('wires the absolute address, the edit link and one shared publish action', async () => {
    mocks.publish.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderWithIntl(
      <CreatorDashboard
        viewerId={42}
        facts={{
          username: 'sara',
          hasProfileImages: false,
          hasTier: true,
          hasPost: false,
          hasPayoutDetails: false,
          isPublished: false,
        }}
        identity={{
          pageName: 'Sara Atelier',
          displayName: null,
          alias: 'sara',
          avatarUrl: null,
        }}
        recentPosts={{ ok: true, posts: [] }}
        heading={<h1>Dashboard</h1>}
      />,
      { locale: 'en', strict: true }
    )

    expect(
      screen.getByText('https://fellowa.test/creators/42')
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit page' })).toHaveAttribute(
      'href',
      '/settings'
    )
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Publish page' }))
    expect(
      screen.getByRole('button', { name: /Publish your page/ })
    ).toBeDisabled()
    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith(42)
  })
})
