import { act, screen, waitFor, within } from '@testing-library/react'
import type { QueryClient } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { Suspense, use, useEffect, useState, type ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'
import { AuthFlowProvider } from './auth-flow-context'
import { AuthVisual } from './auth-visual'
import { InterestsForm } from './interests-form'
import { deferred, renderAuth } from './test-utils'

const mocked = vi.hoisted(() => ({
  replace: vi.fn(),
  toast: { success: vi.fn() },
  auth: {
    interestsForHook: vi.fn(),
    saveInterestsForHook: vi.fn(),
  },
  explore: {
    listExploreCategoriesForHook: vi.fn(),
    listExploreCreatorsForHook: vi.fn(),
  },
}))
// The client's network boundary is the server action (as in the sibling
// steps); the actions themselves are tested against MSW.
vi.mock('@/features/auth/server/hook-actions', () => mocked.auth)
vi.mock('@/features/explore/server/actions', () => mocked.explore)
vi.mock('sonner', () => ({ toast: mocked.toast }))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRouter: () => ({ replace: mocked.replace }),
  usePathname: () => '/auth/interests',
}))

const t = en.auth.interests
const listT = en.auth.categoryList
const viewerId = 42

/**
 * `GET /landing/categories` (BE-LAND-07): `{id, title}`, the title Persian in
 * every locale, in `sort_order` — not id — order.
 */
const categories = [
  { id: 4, title: 'ویدیو' },
  { id: 2, title: 'پادکست' },
  { id: 7, title: 'موسیقی' },
  { id: 1, title: 'طراحی' },
  { id: 9, title: 'نویسندگی' },
  { id: 3, title: 'آموزش' },
  { id: 12, title: 'عکاسی' },
]
const ok = <T,>(data: T) => ({ ok: true, data })
const fail = (status: number, code?: string) => ({
  ok: false,
  status,
  code,
  isNetworkError: false,
})
const expiredSession = { pathname: '/auth', query: { reason: 'expired' } }

beforeEach(() => {
  vi.clearAllMocks()
  mocked.explore.listExploreCategoriesForHook.mockResolvedValue(ok(categories))
  mocked.auth.interestsForHook.mockResolvedValue(ok([]))
  mocked.auth.saveInterestsForHook.mockImplementation(
    async (_viewer: number, { categoryIds }: { categoryIds: number[] }) =>
      ok(categoryIds)
  )
})

/** `next`: the page category step, as the route passes it. */
function renderStep({
  next = '/auth/category',
  locale = 'en',
  queryClient,
}: {
  next?: ComponentProps<typeof InterestsForm>['next']
  locale?: 'en' | 'fa'
  /** Shared across two renders: a return to the step in the same tab. */
  queryClient?: QueryClient
} = {}) {
  return renderAuth(
    <AuthFlowProvider>
      <InterestsForm viewerId={viewerId} next={next} />
      <aside>
        <AuthVisual samples={<p>default samples</p>} />
      </aside>
    </AuthFlowProvider>,
    { locale, ...(queryClient ? { queryClient } : {}) }
  )
}

const chip = (title: string) => screen.getByRole('button', { name: title })
const chips = () =>
  within(screen.getByRole('group', { name: t.topics })).getAllByRole('button')
const submit = () => screen.getByRole('button', { name: t.submit })
const skip = () => screen.getByRole('button', { name: t.skip })

describe('interests (InterestsScreen, FE-AUTH-08)', () => {
  it('is step 3 of 4, with the chips in the order the API lists them', async () => {
    renderStep()
    expect(await screen.findByRole('heading', { name: t.title })).toBeVisible()
    expect(screen.getByText(t.description)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '3'
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuemax',
      '4'
    )
    await waitFor(() =>
      expect(chips().map((button) => button.textContent)).toEqual(
        categories.map((category) => category.title)
      )
    )
    expect(screen.getByText(t.helper)).toBeInTheDocument()
    expect(submit()).toBeDisabled()
    expect(skip()).toBeEnabled()
  })

  it('shows its copy in Persian', async () => {
    renderStep({ locale: 'fa' })
    expect(
      await screen.findByRole('heading', { name: fa.auth.interests.title })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: fa.auth.interests.skip })
    ).toBeInTheDocument()
  })

  it('shows a loading state until the list and the saved set arrive', async () => {
    const saved = deferred<ReturnType<typeof ok<number[]>>>()
    mocked.auth.interestsForHook.mockReturnValue(saved.promise)
    renderStep()
    expect(
      await screen.findByRole('status', { name: en.common.loading })
    ).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    saved.resolve(ok([]))
    expect(
      await screen.findByRole('group', { name: t.topics })
    ).toBeInTheDocument()
  })

  it('ticks what the account saved before', async () => {
    mocked.auth.interestsForHook.mockResolvedValue(ok([7, 3]))
    renderStep()
    await waitFor(() =>
      expect(chip('موسیقی')).toHaveAttribute('aria-pressed', 'true')
    )
    expect(chip('آموزش')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('ویدیو')).toHaveAttribute('aria-pressed', 'false')
    expect(submit()).toBeEnabled()
    expect(mocked.auth.interestsForHook).toHaveBeenCalledWith(viewerId)
  })

  it('saves the ticked set in list order, then goes on to the page category with a toast', async () => {
    const user = userEvent.setup()
    renderStep()
    await user.click(await screen.findByRole('button', { name: 'موسیقی' }))
    await user.click(chip('ویدیو'))
    await user.click(chip('پادکست'))
    await user.click(chip('پادکست'))
    expect(chip('پادکست')).toHaveAttribute('aria-pressed', 'false')
    await user.click(submit())
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith('/auth/category')
    )
    expect(mocked.auth.saveInterestsForHook).toHaveBeenCalledWith(viewerId, {
      categoryIds: [4, 7],
    })
    expect(mocked.toast.success).toHaveBeenCalledWith(
      en.auth.phone.toast.interestsSaved
    )
  })

  it('back on the step after saving, shows the saved set at once, not the one it replaced', async () => {
    const user = userEvent.setup()
    mocked.auth.interestsForHook.mockResolvedValue(ok([2]))
    // The PUT answers the saved set, in list order.
    mocked.auth.saveInterestsForHook.mockResolvedValue(ok([4, 7]))
    const first = renderStep()
    await waitFor(() =>
      expect(chip('پادکست')).toHaveAttribute('aria-pressed', 'true')
    )
    await user.click(chip('پادکست'))
    await user.click(chip('موسیقی'))
    await user.click(chip('ویدیو'))
    await user.click(submit())
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith('/auth/category')
    )
    first.unmount()

    // Back from the category step: the step reads the set again, and that
    // read is still out. The old set must not be what a tap builds on.
    const reread = deferred<ReturnType<typeof ok<number[]>>>()
    mocked.auth.interestsForHook.mockReturnValue(reread.promise)
    renderStep({ queryClient: first.queryClient })
    expect(chip('ویدیو')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('موسیقی')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('پادکست')).toHaveAttribute('aria-pressed', 'false')
    await user.click(chip('طراحی'))
    await user.click(submit())
    await waitFor(() =>
      expect(mocked.auth.saveInterestsForHook).toHaveBeenLastCalledWith(
        viewerId,
        { categoryIds: [4, 7, 1] }
      )
    )
    reread.resolve(ok([4, 7]))
  })

  it('sends once and shows that it is saving', async () => {
    const user = userEvent.setup()
    const save = deferred<ReturnType<typeof ok<number[]>>>()
    mocked.auth.saveInterestsForHook.mockReturnValue(save.promise)
    renderStep()
    await user.click(await screen.findByRole('button', { name: 'موسیقی' }))
    const button = submit()
    await user.click(button)
    expect(
      await screen.findByRole('button', { name: t.pending })
    ).toBeDisabled()
    await user.click(button)
    await user.click(skip())
    expect(mocked.auth.saveInterestsForHook).toHaveBeenCalledTimes(1)
    expect(mocked.replace).not.toHaveBeenCalled()
    save.resolve(ok([7]))
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith('/auth/category')
    )
    expect(mocked.replace).toHaveBeenCalledTimes(1)
  })

  it('skips to the next step without a request, keeping returnTo', async () => {
    const user = userEvent.setup()
    const next = {
      pathname: '/auth/category',
      query: { returnTo: '/settings' },
    }
    renderStep({ next })
    await user.click(await screen.findByRole('button', { name: 'موسیقی' }))
    await user.click(skip())
    expect(mocked.replace).toHaveBeenCalledWith(next)
    expect(mocked.auth.saveInterestsForHook).not.toHaveBeenCalled()
    expect(mocked.toast.success).not.toHaveBeenCalled()
  })

  it.each([
    ['fails', () => fail(500)],
    ['is empty', () => ok([])],
  ])(
    'when the list %s, says so with a retry and still lets the account skip',
    async (_case, answer) => {
      const user = userEvent.setup()
      mocked.explore.listExploreCategoriesForHook.mockResolvedValueOnce(
        answer()
      )
      renderStep()
      expect(await screen.findByRole('alert')).toHaveTextContent(
        listT.loadFailed
      )
      expect(submit()).toBeDisabled()
      expect(skip()).toBeEnabled()

      await user.click(screen.getByRole('button', { name: en.common.retry }))
      expect(
        await screen.findByRole('button', { name: 'موسیقی' })
      ).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(mocked.explore.listExploreCategoriesForHook).toHaveBeenCalledTimes(
        2
      )
    }
  )

  it('when a category is gone (400 USER_CATEGORY_NOT_FOUND), says the list changed and reloads it', async () => {
    const user = userEvent.setup()
    mocked.auth.saveInterestsForHook.mockResolvedValueOnce(
      fail(400, 'USER_CATEGORY_NOT_FOUND')
    )
    renderStep()
    await user.click(await screen.findByRole('button', { name: 'عکاسی' }))
    mocked.explore.listExploreCategoriesForHook.mockResolvedValue(
      ok(categories.slice(0, 6))
    )
    await user.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent(listT.stale)
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'عکاسی' })
      ).not.toBeInTheDocument()
    )
    expect(mocked.explore.listExploreCategoriesForHook).toHaveBeenCalledTimes(2)
    expect(mocked.replace).not.toHaveBeenCalled()
    // The pick that is gone is not sent again.
    expect(submit()).toBeDisabled()
  })

  it('shows a network failure on the error line and lets the account retry', async () => {
    const user = userEvent.setup()
    mocked.auth.saveInterestsForHook.mockResolvedValueOnce({
      ok: false,
      isNetworkError: true,
    })
    renderStep()
    await user.click(await screen.findByRole('button', { name: 'موسیقی' }))
    await user.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.errors.network
    )
    expect(mocked.replace).not.toHaveBeenCalled()
    await user.click(submit())
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith('/auth/category')
    )
  })

  it.each([
    ['signed out (401)', fail(401)],
    ['signed in as someone else', fail(401, 'SESSION_CHANGED')],
    ['the account is gone (404 USER_NOT_FOUND)', fail(404, 'USER_NOT_FOUND')],
  ])('when %s on save, sends the account to sign in', async (_case, answer) => {
    const user = userEvent.setup()
    mocked.auth.saveInterestsForHook.mockResolvedValueOnce(answer)
    renderStep()
    await user.click(await screen.findByRole('button', { name: 'موسیقی' }))
    await user.click(submit())
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith(expiredSession)
    )
    expect(mocked.toast.success).not.toHaveBeenCalled()
  })

  it('when the saved set cannot be read for lack of a session, sends the account to sign in', async () => {
    mocked.auth.interestsForHook.mockResolvedValue(fail(401))
    renderStep()
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith(expiredSession)
    )
  })

  it('when the saved set cannot be read otherwise, starts with nothing ticked', async () => {
    mocked.auth.interestsForHook.mockResolvedValue({
      ok: false,
      isNetworkError: true,
    })
    renderStep()
    expect(
      await screen.findByRole('button', { name: 'موسیقی' })
    ).toHaveAttribute('aria-pressed', 'false')
    expect(mocked.replace).not.toHaveBeenCalled()
  })
})

describe('interests visual column (AuthLayout [C2])', () => {
  const column = () => within(screen.getByRole('complementary'))
  const cardOf = (name: string) =>
    column().getByText(name).closest('[class*="rounded-card"]')
  const creators = t.preview.creators

  it('keeps the usual samples until the list is loaded, and never asks itself', async () => {
    const list = deferred<ReturnType<typeof ok<typeof categories>>>()
    mocked.explore.listExploreCategoriesForHook.mockReturnValue(list.promise)
    renderStep()
    expect(column().getByText('default samples')).toBeInTheDocument()
    list.resolve(ok(categories))
    expect(await column().findByText(t.preview.badge)).toBeInTheDocument()
    // One request: the form's. The column reads the same cache entry.
    expect(mocked.explore.listExploreCategoriesForHook).toHaveBeenCalledTimes(1)
  })

  it('pairs six sample creators with the first six categories, prices with their unit', async () => {
    renderStep()
    expect(await column().findByText(t.preview.badge)).toBeInTheDocument()
    expect(column().getAllByText(t.preview.monthly)).toHaveLength(6)
    expect(column().getByText('موسیقی')).toBeInTheDocument()
    expect(column().queryByText('عکاسی')).not.toBeInTheDocument()
    expect(cardOf(creators.sara)).toHaveTextContent('140,000')
    expect(cardOf(creators.sara)).toHaveTextContent('Toman')
    expect(column().queryByRole('img')).not.toBeInTheDocument()
  })

  it('moves the creators of the ticked categories first and dims the rest', async () => {
    const user = userEvent.setup()
    renderStep()
    await column().findByText(t.preview.badge)
    const names = () =>
      column()
        .getAllByText(new RegExp(Object.values(creators).join('|')))
        .map((node) => node.textContent)
    expect(names()).toEqual([
      creators.sara,
      creators.negar,
      creators.arman,
      creators.amirhossein,
      creators.reza,
      creators.mahsa,
    ])

    // The third category (موسیقی) is arman's, the sixth (آموزش) mahsa's.
    await user.click(screen.getByRole('button', { name: 'موسیقی' }))
    await user.click(screen.getByRole('button', { name: 'آموزش' }))
    await waitFor(() => expect(names()[0]).toBe(creators.arman))
    expect(names()).toEqual([
      creators.arman,
      creators.mahsa,
      creators.sara,
      creators.negar,
      creators.amirhossein,
      creators.reza,
    ])
    expect(cardOf(creators.arman)).toHaveAttribute('data-match', 'true')
    expect(cardOf(creators.sara)).not.toHaveAttribute('data-match')
    expect(cardOf(creators.sara)).toHaveClass('opacity-40')
  })

  it('gives a picked category beyond the first six a card of its own, first', async () => {
    const user = userEvent.setup()
    renderStep()
    await column().findByText(t.preview.badge)
    expect(column().queryByText('عکاسی')).not.toBeInTheDocument()

    // The seventh category: it takes the last card, and the rest dim.
    await user.click(screen.getByRole('button', { name: 'عکاسی' }))
    await waitFor(() =>
      expect(cardOf(creators.mahsa)).toHaveAttribute('data-match', 'true')
    )
    expect(cardOf(creators.mahsa)).toHaveTextContent('عکاسی')
    expect(
      column()
        .getAllByText(new RegExp(Object.values(creators).join('|')))
        .map((node) => node.textContent)[0]
    ).toBe(creators.mahsa)
    expect(column().queryByText('آموزش')).not.toBeInTheDocument()
    expect(cardOf(creators.sara)).toHaveTextContent('ویدیو')
  })
})

/** The next step, still rendering on the server. */
function NextStep({ ready }: { ready: Promise<void> }) {
  use(ready)
  return <p data-testid="next-step" />
}

/**
 * The step under the auth layout's one Suspense boundary, already on screen:
 * the router's move to the next step is a transition React holds until the
 * next step is ready.
 */
function SlowRoute({ ready }: { ready: Promise<void> }) {
  const [left, setLeft] = useState(false)
  useEffect(() => {
    mocked.replace.mockImplementation(() => setLeft(true))
  }, [])
  return (
    <Suspense fallback={<p data-testid="step-fallback" />}>
      {left ? (
        <NextStep ready={ready} />
      ) : (
        <InterestsForm viewerId={viewerId} next="/auth/category" />
      )}
    </Suspense>
  )
}

describe('interests: moving on keeps the step, its button pending', () => {
  afterEach(() => {
    mocked.replace.mockReset()
  })

  function renderSlow() {
    const ready = deferred<void>()
    renderAuth(
      <AuthFlowProvider>
        <SlowRoute ready={ready.promise} />
      </AuthFlowProvider>
    )
    return ready
  }

  it('keeps "continue" loading, with no skeleton, until the next step has rendered', async () => {
    const user = userEvent.setup()
    const ready = renderSlow()
    await user.click(await screen.findByRole('button', { name: 'موسیقی' }))
    await user.click(submit())
    await waitFor(() => expect(mocked.replace).toHaveBeenCalledTimes(1))

    const button = screen.getByRole('button', { name: t.pending })
    expect(button).toBeDisabled()
    expect(button.closest('form')).toHaveAttribute('aria-busy', 'true')
    expect(skip()).toBeDisabled()
    expect(skip()).not.toHaveAttribute('aria-busy')
    expect(screen.getByRole('heading', { name: t.title })).toBeInTheDocument()
    expect(screen.queryByTestId('step-fallback')).not.toBeInTheDocument()

    await user.click(skip())
    expect(mocked.auth.saveInterestsForHook).toHaveBeenCalledTimes(1)
    expect(mocked.replace).toHaveBeenCalledTimes(1)

    await act(async () => ready.resolve())
    expect(await screen.findByTestId('next-step')).toBeInTheDocument()
    expect(screen.queryByTestId('step-fallback')).not.toBeInTheDocument()
  })

  it('marks "skip" busy, not "continue", while the next step loads', async () => {
    const ready = renderSlow()
    await screen.findByRole('button', { name: 'موسیقی' })
    // An awaited act: the click starts a transition that suspends.
    await act(async () => skip().click())

    expect(skip()).toHaveAttribute('aria-busy', 'true')
    expect(skip()).toBeDisabled()
    expect(submit()).not.toHaveAttribute('aria-busy')
    expect(screen.queryByRole('button', { name: t.pending })).toBeNull()
    expect(screen.queryByTestId('step-fallback')).not.toBeInTheDocument()
    await act(async () => skip().click())
    expect(mocked.replace).toHaveBeenCalledTimes(1)
    expect(mocked.replace).toHaveBeenCalledWith('/auth/category')

    await act(async () => ready.resolve())
    expect(await screen.findByTestId('next-step')).toBeInTheDocument()
  })
})
