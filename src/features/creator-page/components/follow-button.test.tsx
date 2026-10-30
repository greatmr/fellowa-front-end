import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '../../../../test/render'

const mocks = vi.hoisted(() => ({
  action: vi.fn(),
  refresh: vi.fn(),
  toastError: vi.fn(),
}))
vi.mock('@/features/creator-page/server/actions', () => ({
  setFollowingAction: mocks.action,
}))
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }))

const { FollowButton } = await import('./follow-button')

beforeEach(() => {
  mocks.action.mockReset()
  mocks.refresh.mockReset()
  mocks.toastError.mockReset()
})

describe('FollowButton (FE-PAGE-02)', () => {
  it('shows the change while it is in flight, then refreshes from the server', async () => {
    let settle: (value: unknown) => void = () => {}
    mocks.action.mockReturnValue(new Promise((resolve) => (settle = resolve)))
    const user = userEvent.setup()
    const { rerender } = renderWithIntl(
      <FollowButton creatorId={4} following={false} />,
      { locale: 'en' }
    )

    await user.click(screen.getByRole('button', { name: 'Follow' }))

    expect(mocks.action).toHaveBeenCalledWith({ creatorId: 4, follow: true })
    const button = screen.getByRole('button', { name: 'Following' })
    expect(button).toBeDisabled()

    await act(async () => settle({ ok: true, data: { isFollowing: true } }))
    expect(mocks.refresh).toHaveBeenCalledTimes(1)

    // router.refresh() re-renders the page with the server's answer.
    rerender(<FollowButton creatorId={4} following />)
    expect(screen.getByRole('button', { name: 'Following' })).toBeEnabled()
  })

  it('follows the page when the server state changes elsewhere', () => {
    const { rerender } = renderWithIntl(
      <FollowButton creatorId={4} following={false} />,
      { locale: 'en' }
    )

    rerender(<FollowButton creatorId={4} following />)

    expect(screen.getByRole('button', { name: 'Following' })).toBeVisible()
  })

  it('unfollows from the Following state', async () => {
    mocks.action.mockResolvedValue({ ok: true, data: { isFollowing: false } })
    const user = userEvent.setup()
    renderWithIntl(<FollowButton creatorId={4} following />, { locale: 'en' })

    await user.click(screen.getByRole('button', { name: 'Following' }))

    expect(mocks.action).toHaveBeenCalledWith({ creatorId: 4, follow: false })
  })

  it.each([
    [{ ok: false, status: 500 }, "That didn't work. Try again."],
    [{ ok: false, status: 401 }, 'Your session ended. Sign in again.'],
  ])(
    'falls back to the server state and says why when refused (%j)',
    async (result, message) => {
      mocks.action.mockResolvedValue(result)
      const user = userEvent.setup()
      renderWithIntl(<FollowButton creatorId={4} following={false} />, {
        locale: 'en',
      })

      await user.click(screen.getByRole('button', { name: 'Follow' }))

      await waitFor(() =>
        expect(mocks.toastError).toHaveBeenCalledWith(message)
      )
      expect(
        await screen.findByRole('button', { name: 'Follow' })
      ).toBeEnabled()
      expect(mocks.refresh).not.toHaveBeenCalled()
    }
  )
})
