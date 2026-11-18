import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../../../messages/en.json'
import { AuthFlowProvider, useAuthFlow } from './auth-flow-context'
import { AuthVisual } from './auth-visual'
import { PageAddressForm } from './page-address-form'
import { renderAuth } from './test-utils'

const mocked = vi.hoisted(() => ({
  replace: vi.fn(),
  toast: { success: vi.fn() },
  actions: {
    aliasAvailabilityForHook: vi.fn(),
    setAliasForHook: vi.fn(),
  },
}))
vi.mock('@/features/auth/server/hook-actions', () => mocked.actions)
// Imported by the visual column's interests preview; not used on this step.
vi.mock('@/features/explore/server/actions', () => ({
  listExploreCategoriesForHook: vi.fn(),
  listExploreCreatorsForHook: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: mocked.toast }))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRouter: () => ({ replace: mocked.replace }),
  usePathname: () => '/auth/url',
}))

const t = en.auth.url

/** `GET /auth/alias/availability` (BE-AUTH-09), all four keys always present. */
const answer = (
  alias: string,
  reason: 'too_short' | 'invalid' | 'reserved' | 'taken' | null,
  suggestions: string[] = []
) => ({
  ok: true,
  data: { alias, available: reason === null, reason, suggestions },
})
const fail = (status: number, code: string) => ({
  ok: false,
  status,
  code,
  isNetworkError: false,
})

beforeEach(() => {
  vi.clearAllMocks()
  mocked.actions.aliasAvailabilityForHook.mockImplementation(
    async ({ alias }: { alias: string }) => answer(alias, null)
  )
  mocked.actions.setAliasForHook.mockResolvedValue({ ok: true, data: null })
})

afterEach(() => {
  vi.useRealTimers()
})

function setup() {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

/**
 * `pageName`: what the account step left in memory. `profileName`: the owner
 * profile's `displayName` the route reads (`null` for the placeholder).
 * `currentAddress`: the page's alias, once it has one. The destination is the
 * route's: the interests step in sign-up, `returnTo` when it stands alone.
 */
function renderStep(
  pageName = '',
  profileName: string | null = null,
  returnTo?: string,
  currentAddress: string | null = null
) {
  function Seeded() {
    const { setPageName } = useAuthFlow()
    const [ready, setReady] = useState(false)
    useEffect(() => {
      setPageName(pageName)
      setReady(true)
    }, [setPageName])
    return ready ? (
      <>
        <PageAddressForm
          destination={returnTo ?? '/auth/interests'}
          returnTo={returnTo}
          profileName={profileName}
          currentAddress={currentAddress}
        />
        <AuthVisual samples={null} />
      </>
    ) : null
  }
  return renderAuth(
    <AuthFlowProvider>
      <Seeded />
    </AuthFlowProvider>
  )
}

const field = () => screen.findByLabelText(t.label)
const submit = () => screen.getByRole('button', { name: t.submit })
const settle = () => act(() => vi.advanceTimersByTimeAsync(400))

describe('page address (OnboardingUrlScreen)', () => {
  it('is step 2 of 4 and prefills from a Latin page name', async () => {
    setup()
    renderStep('Studio Sara')
    expect(await field()).toHaveValue('studiosara')
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '2'
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuemax',
      '4'
    )
    expect(screen.getAllByText(t.prefix)).toHaveLength(2)
  })

  it('shows the address as @username, never a fellowa.ir link (FQ-18)', async () => {
    setup()
    renderStep('Studio Sara')
    await field()
    expect(t.prefix).toBe('@')
    expect(screen.getByLabelText(t.label)).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('fellowa.ir')
  })

  it('takes the name from the owner profile after a Google sign-up or a reload', async () => {
    setup()
    // Nothing in memory: the account step was never shown in this tab.
    renderStep('', 'Ali Rezaei')
    expect(await field()).toHaveValue('alirezaei')
    expect(
      screen.getByRole('heading', { name: 'Ali Rezaei', hidden: true })
    ).toBeInTheDocument()
  })

  it('prefers the profile name over the in-memory one', async () => {
    setup()
    renderStep('Old Name', 'New Name')
    expect(await field()).toHaveValue('newname')
  })

  it('leaves the field and the preview name empty for the placeholder name', async () => {
    setup()
    // The backend returns `null` while the account holds its placeholder.
    renderStep('', null)
    expect(await field()).toHaveValue('')
    // Only the step's own title; the preview card has no name heading.
    expect(
      screen.getAllByRole('heading', { hidden: true }).map((h) => h.textContent)
    ).toEqual([t.title])
  })

  it('stands alone when reached from settings: no step count, back to settings (FE-ONB-02)', async () => {
    const user = setup()
    renderStep('', 'Sara', '/settings')
    await user.clear(await field())
    await user.type(await field(), 'sara_art')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: t.back })).toHaveAttribute(
      'href',
      '/settings'
    )
    await settle()
    await waitFor(() => expect(submit()).toBeEnabled())
    await user.click(submit())
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith('/settings')
    )
    expect(mocked.actions.setAliasForHook).toHaveBeenCalledWith({
      alias: 'sara_art',
    })
  })

  it('in sign-up, goes back to the account step', async () => {
    setup()
    renderStep('Sara')
    expect(await screen.findByRole('link', { name: t.back })).toHaveAttribute(
      'href',
      '/auth/account'
    )
  })

  it('does not prefill from a Persian name', async () => {
    setup()
    renderStep('سارا')
    expect(await field()).toHaveValue('')
    expect(submit()).toBeDisabled()
  })

  it('checks 400 ms after typing stops, then allows saving', async () => {
    const user = setup()
    renderStep()
    await user.type(await field(), 'sara_art')
    expect(mocked.actions.aliasAvailabilityForHook).not.toHaveBeenCalled()
    await settle()
    await waitFor(() =>
      expect(mocked.actions.aliasAvailabilityForHook).toHaveBeenCalledWith({
        alias: 'sara_art',
      })
    )
    expect(mocked.actions.aliasAvailabilityForHook).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(t.available)).toBeInTheDocument()
    expect(submit()).toBeEnabled()
  })

  it('lowercases, drops what the API refuses (dots too) and says so', async () => {
    const user = setup()
    renderStep()
    await user.type(await field(), 'Sara.Art-۱')
    expect(await field()).toHaveValue('saraart')
    expect(screen.getByText(t.chars)).toBeInTheDocument()
  })

  it('says too short without asking the API', async () => {
    const user = setup()
    renderStep()
    await user.type(await field(), 'ab')
    await settle()
    expect(
      screen.getByText(t.tooShort.replace('{min, number}', '3'))
    ).toBeInTheDocument()
    expect(mocked.actions.aliasAvailabilityForHook).not.toHaveBeenCalled()
    expect(submit()).toBeDisabled()
  })

  it('offers the suggestions of a taken address, which are then checked', async () => {
    const user = setup()
    mocked.actions.aliasAvailabilityForHook.mockImplementation(
      async ({ alias }: { alias: string }) =>
        alias === 'studio'
          ? answer('studio', 'taken', ['studio_', 'studio_art', 'studio1405'])
          : answer(alias, null)
    )
    renderStep()
    await user.type(await field(), 'studio')
    await settle()
    expect(await screen.findByText(t.taken)).toBeInTheDocument()
    expect(submit()).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'studio_art' }))
    expect(await field()).toHaveValue('studio_art')
    await settle()
    expect(await screen.findByText(t.available)).toBeInTheDocument()
    expect(screen.queryByText(t.taken)).not.toBeInTheDocument()
  })

  it('says a reserved address cannot be used', async () => {
    const user = setup()
    mocked.actions.aliasAvailabilityForHook.mockImplementation(
      async ({ alias }: { alias: string }) => answer(alias, 'reserved')
    )
    renderStep()
    await user.type(await field(), 'admin')
    await settle()
    expect(await screen.findByText(t.reserved)).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('treats a throttled check as unknown and lets the save decide', async () => {
    const user = setup()
    mocked.actions.aliasAvailabilityForHook.mockResolvedValue(
      fail(429, 'TOO_MANY_REQUESTS')
    )
    renderStep()
    await user.type(await field(), 'sara')
    await settle()
    await waitFor(() => expect(submit()).toBeEnabled())
    expect(screen.queryByText(t.taken)).not.toBeInTheDocument()
  })

  it('asks once per address', async () => {
    const user = setup()
    renderStep()
    await user.type(await field(), 'sara')
    await settle()
    await screen.findByText(t.available)
    await user.type(await field(), 'x')
    await settle()
    await user.type(await field(), '{Backspace}')
    await settle()
    await screen.findByText(t.available)
    expect(
      mocked.actions.aliasAvailabilityForHook.mock.calls.map(([input]) => input)
    ).toEqual([{ alias: 'sara' }, { alias: 'sarax' }])
  })

  it('shows taken when the save loses a race (409), then saves another', async () => {
    const user = setup()
    mocked.actions.setAliasForHook.mockResolvedValueOnce(
      fail(409, 'AUTH_ALIAS_TAKEN')
    )
    renderStep()
    await user.type(await field(), 'sara')
    await settle()
    await waitFor(() => expect(submit()).toBeEnabled())
    await user.click(submit())
    expect(await screen.findByText(t.taken)).toBeInTheDocument()
    expect(mocked.replace).not.toHaveBeenCalled()

    await user.type(await field(), '2')
    await settle()
    await waitFor(() => expect(submit()).toBeEnabled())
    await user.click(submit())
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith('/auth/interests')
    )
    expect(mocked.actions.setAliasForHook).toHaveBeenLastCalledWith({
      alias: 'sara2',
    })
  })

  it('in sign-up, creates the page and goes on to the interests step (FE-AUTH-08)', async () => {
    const user = setup()
    renderStep('Sara')
    await user.type(await field(), '_art')
    await settle()
    await waitFor(() => expect(submit()).toBeEnabled())
    await user.click(submit())
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith('/auth/interests')
    )
    expect(mocked.actions.setAliasForHook).toHaveBeenCalledWith({
      alias: 'sara_art',
    })
    expect(mocked.toast.success).toHaveBeenCalledWith(
      en.auth.phone.toast.pageCreated
    )
  })

  it('back from the interests step, starts from the page address and saves nothing unchanged', async () => {
    const user = setup()
    renderStep('Sara', 'Sara', undefined, 'sara_art')
    expect(await field()).toHaveValue('sara_art')
    await settle()
    expect(await screen.findByText(t.available)).toBeInTheDocument()
    await user.click(submit())
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith('/auth/interests')
    )
    expect(mocked.actions.setAliasForHook).not.toHaveBeenCalled()
    expect(mocked.toast.success).not.toHaveBeenCalled()
  })

  it('back from the interests step, renames the page with a plain "saved"', async () => {
    const user = setup()
    renderStep('Sara', 'Sara', undefined, 'sara_art')
    await user.clear(await field())
    await user.type(await field(), 'sara_studio')
    await settle()
    await waitFor(() => expect(submit()).toBeEnabled())
    await user.click(submit())
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith('/auth/interests')
    )
    expect(mocked.actions.setAliasForHook).toHaveBeenCalledWith({
      alias: 'sara_studio',
    })
    expect(mocked.toast.success).toHaveBeenCalledWith(en.auth.phone.toast.saved)
  })

  it('feeds the live preview card with the name and the address', async () => {
    const user = setup()
    renderStep('Sara')
    await user.clear(await field())
    await user.type(await field(), 'sara_studio')
    expect(screen.getByText(en.auth.preview.badge)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sara' })).toBeInTheDocument()
    expect(screen.getByText('sara_studio')).toBeInTheDocument()
  })

  it('links back to the account step', async () => {
    setup()
    renderStep()
    await field()
    expect(screen.getByRole('link', { name: t.back })).toHaveAttribute(
      'href',
      '/auth/account'
    )
  })
})
