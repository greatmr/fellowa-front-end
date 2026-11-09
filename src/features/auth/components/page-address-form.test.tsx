import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../../../messages/en.json'
import { AuthFlowProvider, useAuthFlow } from './auth-flow-context'
import { AuthVisual } from './auth-visual'
import { PageAddressForm } from './page-address-form'
import { renderAuth } from './test-utils'

const mocked = vi.hoisted(() => ({
  replace: vi.fn(),
  actions: {
    aliasAvailabilityForHook: vi.fn(),
    setAliasForHook: vi.fn(),
  },
}))
vi.mock('@/features/auth/server/hook-actions', () => mocked.actions)
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

function renderStep(pageName = '') {
  function Seeded() {
    const flow = useAuthFlow()
    const { setPageName } = flow
    useEffect(() => {
      setPageName(pageName)
    }, [setPageName])
    return flow.pageName === pageName ? (
      <>
        <PageAddressForm destination="/studio" />
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
  it('is step 2 of 2 and prefills from a Latin page name', async () => {
    setup()
    renderStep('Studio Sara')
    expect(await field()).toHaveValue('studiosara')
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '2'
    )
    expect(screen.getAllByText(t.prefix)).toHaveLength(2)
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
    await waitFor(() => expect(mocked.replace).toHaveBeenCalledWith('/studio'))
    expect(mocked.actions.setAliasForHook).toHaveBeenLastCalledWith({
      alias: 'sara2',
    })
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
      '/en/auth/account'
    )
  })
})
