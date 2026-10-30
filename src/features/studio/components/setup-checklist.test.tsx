import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as I18nNavigation from '@/i18n/navigation'
import type { SetupFacts } from '@/features/studio/types/dashboard'
import { renderWithIntl } from '../../../../test/render'

const mocks = vi.hoisted(() => ({
  publish: vi.fn(),
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))
vi.mock('@/features/studio/server/actions', () => ({
  publishPageAction: mocks.publish,
}))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nNavigation>()),
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}))

const { SetupChecklist } = await import('./setup-checklist')

const fresh: SetupFacts = {
  username: null,
  hasTier: false,
  hasPost: false,
  hasPayoutDetails: false,
  isPublished: false,
}

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset()
})

function renderChecklist(facts: SetupFacts) {
  return renderWithIntl(<SetupChecklist viewerId={42} facts={facts} />, {
    locale: 'en',
  })
}

describe('SetupChecklist (FE-STUDIO-01, CP-01 / CP-04)', () => {
  it('shows all five steps and no progress for an account with no page', () => {
    renderChecklist(fresh)

    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('0 of 5 steps done')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    )
  })

  it('reports each finished step from the facts, not from clicks', () => {
    renderChecklist({
      ...fresh,
      username: 'sara',
      hasTier: true,
      hasPayoutDetails: true,
    })

    expect(screen.getByText('3 of 5 steps done')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByText(/— done/)).toBeInTheDocument()
    expect(within(items[2]).getByText(/— to do/)).toBeInTheDocument()
  })

  it('links the steps whose screen exists and offers nothing for the others', () => {
    renderChecklist(fresh)

    expect(screen.getByRole('link', { name: 'Set up tiers' })).toHaveAttribute(
      'href',
      '/en/studio/tiers'
    )
    expect(screen.getByRole('link', { name: 'Create a post' })).toHaveAttribute(
      'href',
      '/en/studio/posts/new'
    )
    expect(
      screen.getByRole('link', { name: 'Choose a username' })
    ).toHaveAttribute('href', '/en/onboarding')
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })

  it('holds the publish button back until there is a username, then a tier', () => {
    const { unmount } = renderChecklist(fresh)
    expect(screen.getByRole('button', { name: 'Publish page' })).toBeDisabled()
    expect(
      screen.getByText('Choose a username before you publish.')
    ).toBeInTheDocument()
    unmount()

    renderChecklist({ ...fresh, username: 'sara' })
    expect(screen.getByRole('button', { name: 'Publish page' })).toBeDisabled()
    expect(
      screen.getByText('Create a membership tier before you publish.')
    ).toBeInTheDocument()
  })

  it('publishes for this viewer, then refreshes to re-read the checklist', async () => {
    mocks.publish.mockResolvedValue({ ok: true, data: null })
    const user = userEvent.setup()
    renderChecklist({ ...fresh, username: 'sara', hasTier: true })

    await user.click(screen.getByRole('button', { name: 'Publish page' }))

    expect(mocks.publish).toHaveBeenCalledWith(42)
    expect(mocks.refresh).toHaveBeenCalledOnce()
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Your page is now public.')
  })

  it('says so and does not refresh when the backend refuses', async () => {
    mocks.publish.mockResolvedValue({
      ok: false,
      status: 400,
      code: 'USER_ALIAS_REQUIRED',
    })
    const user = userEvent.setup()
    renderChecklist({ ...fresh, username: 'sara', hasTier: true })

    await user.click(screen.getByRole('button', { name: 'Publish page' }))

    expect(mocks.toastError).toHaveBeenCalledWith(
      'Choose a username before you publish.'
    )
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('offers no publish button once the page is public', () => {
    renderChecklist({
      username: 'sara',
      hasTier: true,
      hasPost: true,
      hasPayoutDetails: true,
      isPublished: true,
    })

    expect(screen.getByText('5 of 5 steps done')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Publish page' })
    ).not.toBeInTheDocument()
  })

  it('renders in Persian with Persian digits', () => {
    renderWithIntl(<SetupChecklist viewerId={42} facts={fresh} />, {
      locale: 'fa',
    })

    expect(screen.getByText('۰ از ۵ مرحله انجام شد')).toBeInTheDocument()
  })
})
