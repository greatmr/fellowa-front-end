import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as I18nNavigation from '@/i18n/navigation'
import type { SetupFacts } from '@/features/studio/types/dashboard'
import { renderWithIntl } from '../../../../test/render'

const mocks = vi.hoisted(() => ({
  publish: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock('@/features/studio/server/actions', () => ({
  publishPageAction: mocks.publish,
}))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nNavigation>()),
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { SetupChecklist } = await import('./setup-checklist')
const { PublishPageProvider } = await import('./publish-page-provider')
const { resetChecklistDismissal } =
  await import('@/features/studio/lib/checklist-dismissal')

const fresh: SetupFacts = {
  username: null,
  hasProfileImages: false,
  hasTier: false,
  hasPost: false,
  hasPayoutDetails: false,
  isPublished: false,
}

function renderChecklist(facts: SetupFacts, locale: 'en' | 'fa' = 'en') {
  return renderWithIntl(
    <PublishPageProvider viewerId={42}>
      <SetupChecklist facts={facts} />
    </PublishPageProvider>,
    { locale, strict: true }
  )
}

beforeEach(() => {
  mocks.publish.mockReset()
  mocks.refresh.mockReset()
  resetChecklistDismissal()
})

describe('SetupChecklist (FE-STUDIO-02 re-port, CP-04)', () => {
  it('shows the five design steps, a draft badge and no progress for a new account', () => {
    renderChecklist(fresh)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('Add a profile photo and cover')
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('0 of 5 steps done')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    )
  })

  it('marks step 1 done from the stored photo and cover, not from the username', () => {
    const { unmount } = renderChecklist({ ...fresh, username: 'sara' })
    expect(
      within(screen.getAllByRole('listitem')[0]).getByText(/— to do/)
    ).toBeInTheDocument()
    unmount()

    renderChecklist({ ...fresh, hasProfileImages: true })
    expect(
      within(screen.getAllByRole('listitem')[0]).getByText(/— done/)
    ).toBeInTheDocument()
    expect(screen.getByText('1 of 5 steps done')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
  })

  it('titles the card as the design does (FQ-28 B)', () => {
    renderChecklist(fresh)
    expect(
      screen.getByRole('heading', { name: 'Your page is ready!' })
    ).toBeInTheDocument()
  })

  it('links the steps whose screen exists; payout shows state only', () => {
    renderChecklist({ ...fresh, username: 'sara' })

    expect(
      screen.getByRole('link', { name: /Add a profile photo and cover/ })
    ).toHaveAttribute('href', '/settings')
    expect(
      screen.getByRole('link', { name: /Create your first membership tier/ })
    ).toHaveAttribute('href', '/studio/tiers')
    expect(
      screen.getByRole('link', { name: /Publish your first post/ })
    ).toHaveAttribute('href', '/studio/posts/new')
    expect(
      screen.queryByRole('link', { name: /Add your payout details/ })
    ).not.toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })

  it('publishes from the publish row once there is a username and a tier', async () => {
    mocks.publish.mockResolvedValue({ ok: true, data: null })
    const user = userEvent.setup()
    renderChecklist({ ...fresh, username: 'sara', hasTier: true })

    await user.click(screen.getByRole('button', { name: /Publish your page/ }))

    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith(42)
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  it('holds the publish row back with its reason before there is a tier', () => {
    renderChecklist({ ...fresh, username: 'sara' })

    const row = screen.getByRole('button', { name: /Publish your page/ })
    expect(row).toBeDisabled()
    expect(row).toHaveAccessibleDescription(
      'Create a membership tier before you publish.'
    )
  })

  it('hides for the rest of the session on «later»', async () => {
    const user = userEvent.setup()
    const { unmount } = renderChecklist(fresh)

    await user.click(screen.getByRole('button', { name: 'Later' }))
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    unmount()

    // Still hidden on the next visit in the same session.
    renderChecklist(fresh)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(
      window.sessionStorage.getItem('fellowa:studio-checklist-dismissed')
    ).toBe('1')
  })

  it('collapses and expands the step list', async () => {
    const user = userEvent.setup()
    renderChecklist(fresh)

    const toggle = screen.getByRole('button', { name: 'Collapse checklist' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await user.click(toggle)

    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    const expand = screen.getByRole('button', { name: 'Expand checklist' })
    expect(expand).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('0 of 5 steps done')).toBeInTheDocument()

    await user.click(expand)
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
  })

  it('drops the draft badge once published, and leaves when all five are done', () => {
    const { unmount } = renderChecklist({
      ...fresh,
      username: 'sara',
      hasTier: true,
      isPublished: true,
    })
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
    unmount()

    const { container } = renderChecklist({
      username: 'sara',
      hasProfileImages: true,
      hasTier: true,
      hasPost: true,
      hasPayoutDetails: true,
      isPublished: true,
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders in Persian with Persian digits', () => {
    renderChecklist(fresh, 'fa')

    expect(screen.getByText('۰ از ۵ مرحله انجام شد')).toBeInTheDocument()
    expect(
      screen.getByText('عکس پروفایل و کاور را اضافه کن')
    ).toBeInTheDocument()
  })
})
