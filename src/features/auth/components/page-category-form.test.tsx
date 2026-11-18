import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'
import { PageCategoryForm } from './page-category-form'
import { deferred, renderAuth } from './test-utils'

const mocked = vi.hoisted(() => ({
  replace: vi.fn(),
  toast: { success: vi.fn() },
  auth: { setPageCategoryForHook: vi.fn() },
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
  usePathname: () => '/auth/category',
}))

const t = en.auth.pageCategory
const listT = en.auth.categoryList
const viewerId = 42

/** `GET /landing/categories` (BE-LAND-07), in `sort_order`, not id, order. */
const categories = [
  { id: 4, title: 'ویدیو' },
  { id: 2, title: 'پادکست' },
  { id: 7, title: 'موسیقی' },
  { id: 1, title: 'طراحی' },
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
  // `PUT /user/category` answers `{ message: 'Category updated' }`; the
  // action drops it.
  mocked.auth.setPageCategoryForHook.mockResolvedValue(ok(null))
})

function renderStep({
  currentCategoryId = null,
  returnTo,
  locale = 'en',
}: {
  currentCategoryId?: number | null
  returnTo?: string
  locale?: 'en' | 'fa'
} = {}) {
  return renderAuth(
    <PageCategoryForm
      viewerId={viewerId}
      currentCategoryId={currentCategoryId}
      destination={returnTo ?? '/studio'}
      returnTo={returnTo}
    />,
    { locale }
  )
}

const group = () => screen.findByRole('radiogroup', { name: t.options })
const radio = (title: string) => screen.getByRole('radio', { name: title })
const checked = () =>
  screen
    .getAllByRole('radio')
    .filter((element) => element.getAttribute('aria-checked') === 'true')
    .map((element) => element.textContent)
const submit = () => screen.getByRole('button', { name: t.submit })
const skip = () => screen.getByRole('button', { name: t.skip })

describe('page category (OnboardingTopicsScreen, FE-AUTH-08 / FQ-23)', () => {
  it('is step 4 of 4: one choice among the categories, in API order, none yet', async () => {
    renderStep()
    expect(screen.getByRole('heading', { name: t.title })).toBeInTheDocument()
    expect(screen.getByText(t.description)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '4'
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuemax',
      '4'
    )
    const radios = within(await group()).getAllByRole('radio')
    expect(radios.map((element) => element.textContent)).toEqual(
      categories.map((category) => category.title)
    )
    expect(checked()).toEqual([])
    // Nothing picked: the first option takes the focus.
    expect(radios.map((element) => element.tabIndex)).toEqual([0, -1, -1, -1])
    expect(screen.queryByText(t.helper)).not.toBeInTheDocument()
    expect(submit()).toBeDisabled()
    expect(skip()).toBeEnabled()
    // The design's "other" is no category the API has.
    expect(screen.queryByText('سایر')).not.toBeInTheDocument()
  })

  it('shows its copy in Persian', async () => {
    renderStep({ locale: 'fa' })
    expect(
      screen.getByRole('heading', { name: fa.auth.pageCategory.title })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('radiogroup', {
        name: fa.auth.pageCategory.options,
      })
    ).toBeInTheDocument()
  })

  it('starts from the page category', async () => {
    renderStep({ currentCategoryId: 7 })
    await group()
    expect(checked()).toEqual(['موسیقی'])
    expect(radio('موسیقی')).toHaveAttribute('tabindex', '0')
    expect(screen.getByText(t.helper)).toBeInTheDocument()
    expect(submit()).toBeEnabled()
  })

  it('keeps exactly one pick: a new one replaces the last', async () => {
    const user = userEvent.setup()
    renderStep()
    await group()
    await user.click(radio('پادکست'))
    expect(checked()).toEqual(['پادکست'])
    await user.click(radio('طراحی'))
    expect(checked()).toEqual(['طراحی'])
    // Picking it again keeps it: a radio is not a toggle.
    await user.click(radio('طراحی'))
    expect(checked()).toEqual(['طراحی'])
    expect(submit()).toBeEnabled()
  })

  it('moves and picks with the arrow keys in reading order, Home and End', async () => {
    const user = userEvent.setup()
    renderStep({ currentCategoryId: 4 })
    await group()
    radio('ویدیو').focus()
    await user.keyboard('{ArrowRight}')
    expect(checked()).toEqual(['پادکست'])
    expect(radio('پادکست')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(checked()).toEqual(['موسیقی'])
    await user.keyboard('{ArrowLeft}')
    expect(checked()).toEqual(['پادکست'])
    await user.keyboard('{End}')
    expect(checked()).toEqual(['طراحی'])
    await user.keyboard('{ArrowRight}')
    expect(checked()).toEqual(['ویدیو'])
    await user.keyboard('{Home}')
    expect(checked()).toEqual(['ویدیو'])
  })

  it('in Persian, the left arrow goes on (right to left)', async () => {
    const user = userEvent.setup()
    renderStep({ currentCategoryId: 4, locale: 'fa' })
    await screen.findByRole('radiogroup')
    radio('ویدیو').focus()
    await user.keyboard('{ArrowLeft}')
    expect(checked()).toEqual(['پادکست'])
    await user.keyboard('{ArrowRight}')
    expect(checked()).toEqual(['ویدیو'])
  })

  it('saves the pick, then ends sign-up with a toast', async () => {
    const user = userEvent.setup()
    renderStep()
    await group()
    await user.click(radio('پادکست'))
    await user.click(submit())
    await waitFor(() => expect(mocked.replace).toHaveBeenCalledWith('/studio'))
    expect(mocked.auth.setPageCategoryForHook).toHaveBeenCalledWith(viewerId, {
      categoryId: 2,
    })
    expect(mocked.toast.success).toHaveBeenCalledWith(en.auth.phone.toast.saved)
  })

  it('saves nothing when the page category is unchanged', async () => {
    const user = userEvent.setup()
    renderStep({ currentCategoryId: 7 })
    await group()
    await user.click(submit())
    expect(mocked.replace).toHaveBeenCalledWith('/studio')
    expect(mocked.auth.setPageCategoryForHook).not.toHaveBeenCalled()
  })

  it('skips to the destination without a request', async () => {
    const user = userEvent.setup()
    renderStep({ returnTo: '/settings' })
    await group()
    await user.click(radio('پادکست'))
    await user.click(skip())
    expect(mocked.replace).toHaveBeenCalledWith('/settings')
    expect(mocked.auth.setPageCategoryForHook).not.toHaveBeenCalled()
  })

  it('sends once and shows that it is saving', async () => {
    const user = userEvent.setup()
    const save = deferred<ReturnType<typeof ok<null>>>()
    mocked.auth.setPageCategoryForHook.mockReturnValue(save.promise)
    renderStep()
    await group()
    await user.click(radio('پادکست'))
    const button = submit()
    await user.click(button)
    expect(
      await screen.findByRole('button', { name: t.pending })
    ).toBeDisabled()
    await user.click(button)
    await user.click(skip())
    expect(mocked.auth.setPageCategoryForHook).toHaveBeenCalledTimes(1)
    save.resolve(ok(null))
    await waitFor(() => expect(mocked.replace).toHaveBeenCalledWith('/studio'))
    expect(mocked.replace).toHaveBeenCalledTimes(1)
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
      expect(await group()).toBeInTheDocument()
    }
  )

  it('when the category is gone (400 USER_CATEGORY_NOT_FOUND), says the list changed and reloads it', async () => {
    const user = userEvent.setup()
    mocked.auth.setPageCategoryForHook.mockResolvedValueOnce(
      fail(400, 'USER_CATEGORY_NOT_FOUND')
    )
    renderStep()
    await group()
    await user.click(radio('طراحی'))
    mocked.explore.listExploreCategoriesForHook.mockResolvedValue(
      ok(categories.slice(0, 3))
    )
    await user.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent(listT.stale)
    await waitFor(() =>
      expect(
        screen.queryByRole('radio', { name: 'طراحی' })
      ).not.toBeInTheDocument()
    )
    expect(mocked.explore.listExploreCategoriesForHook).toHaveBeenCalledTimes(2)
    expect(mocked.replace).not.toHaveBeenCalled()
    expect(submit()).toBeDisabled()
  })

  it.each([
    [undefined, '/auth/url'],
    ['/settings', { pathname: '/auth/url', query: { returnTo: '/settings' } }],
  ])(
    'with no page (400 USER_ALIAS_REQUIRED) and returnTo %s, goes to the address step',
    async (returnTo, href) => {
      const user = userEvent.setup()
      mocked.auth.setPageCategoryForHook.mockResolvedValueOnce(
        fail(400, 'USER_ALIAS_REQUIRED')
      )
      renderStep({ returnTo })
      await group()
      await user.click(radio('پادکست'))
      await user.click(submit())
      await waitFor(() => expect(mocked.replace).toHaveBeenCalledWith(href))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    }
  )

  it.each([
    ['signed out (401)', fail(401)],
    ['signed in as someone else', fail(401, 'SESSION_CHANGED')],
    ['the account is gone (404 USER_NOT_FOUND)', fail(404, 'USER_NOT_FOUND')],
  ])('when %s, sends the account to sign in', async (_case, answer) => {
    const user = userEvent.setup()
    mocked.auth.setPageCategoryForHook.mockResolvedValueOnce(answer)
    renderStep()
    await group()
    await user.click(radio('پادکست'))
    await user.click(submit())
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith(expiredSession)
    )
    expect(mocked.toast.success).not.toHaveBeenCalled()
  })

  it('shows a network failure on the error line and lets the account retry', async () => {
    const user = userEvent.setup()
    mocked.auth.setPageCategoryForHook.mockResolvedValueOnce({
      ok: false,
      isNetworkError: true,
    })
    renderStep()
    await group()
    await user.click(radio('پادکست'))
    await user.click(submit())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.errors.network
    )
    expect(mocked.replace).not.toHaveBeenCalled()
    await user.click(submit())
    await waitFor(() => expect(mocked.replace).toHaveBeenCalledWith('/studio'))
  })
})
