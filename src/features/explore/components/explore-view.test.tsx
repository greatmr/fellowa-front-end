import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ExploreCreator,
  ExploreCreatorPage,
  ExploreQuery,
} from '@/features/explore/types/creator'
import type { ApiActionResult } from '@/lib/api/action-result'
import { renderWithIntl } from '../../../../test/render'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}))

// The server boundary is tested in server/actions.test.ts; here only the
// action is replaced, so the real hook (key, paging) runs.
const action = vi.hoisted(() => ({
  list: vi.fn<
    (
      viewerId: number | null,
      input: ExploreQuery
    ) => Promise<ApiActionResult<ExploreCreatorPage>>
  >(),
}))
vi.mock('@/features/explore/server/actions', () => ({
  listExploreCreatorsForHook: action.list,
}))

const { ExploreView } = await import('./explore-view')

const creator = (id: number, extra: Partial<ExploreCreator> = {}) => ({
  id,
  alias: `creator${id}`,
  avatarUrl: null,
  coverUrl: null,
  bio: null,
  followerCount: null,
  ...extra,
})
const page = (
  items: ExploreCreator[],
  nextPage: number | null = null
): ApiActionResult<ExploreCreatorPage> => ({
  ok: true,
  data: { items, total: items.length, nextPage },
})

function renderView(ui: ReactElement, locale: 'fa' | 'en' = 'en') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderWithIntl(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
    { locale }
  )
}

beforeEach(() => {
  window.history.replaceState(null, '', '/explore')
  action.list.mockReset()
})
afterEach(() => vi.useRealTimers())

describe('ExploreView', () => {
  it('asks for the ranked list as this viewer and renders each creator', async () => {
    action.list.mockResolvedValue(
      page([
        creator(4, {
          alias: 'dana',
          bio: 'Painter of small things',
          followerCount: 1200,
        }),
      ])
    )
    renderView(<ExploreView viewerId={42} />)

    expect(
      await screen.findByRole('heading', { level: 2, name: 'dana' })
    ).toBeInTheDocument()
    expect(action.list).toHaveBeenCalledWith(42, { alias: '', page: 1 })
    expect(screen.getByText('Painter of small things')).toHaveAttribute(
      'dir',
      'auto'
    )
    expect(screen.getByText('1,200').closest('p')).toHaveTextContent(
      '1,200 followers'
    )
  })

  it('formats counts with Persian digits in fa', async () => {
    action.list.mockResolvedValue(page([creator(4, { followerCount: 1200 })]))
    renderView(<ExploreView viewerId={null} />, 'fa')

    expect(await screen.findByText(/دنبال‌کننده/)).toHaveTextContent('۱٬۲۰۰')
  })

  it('searches by the alias in the URL and debounces typing into it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    window.history.replaceState(null, '', '/explore?q=da')
    const replace = vi.spyOn(window.history, 'replaceState')
    action.list.mockResolvedValue(page([creator(4)]))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderView(<ExploreView viewerId={null} />)

    await waitFor(() =>
      expect(action.list).toHaveBeenCalledWith(null, { alias: 'da', page: 1 })
    )
    await user.type(screen.getByRole('searchbox'), 'n')
    expect(replace).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(String(replace.mock.lastCall?.[2])).toMatch(/\/explore\?q=dan$/)
  })

  it('shows a no-results state with a way back when a search is empty', async () => {
    window.history.replaceState(null, '', '/explore?q=zz')
    const replace = vi.spyOn(window.history, 'replaceState')
    action.list.mockResolvedValue(page([]))
    const user = userEvent.setup()
    renderView(<ExploreView viewerId={null} />)

    expect(
      await screen.findByText('No creator matches this search')
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(String(replace.mock.lastCall?.[2])).toMatch(/\/explore$/)
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('says so when there are no creators at all', async () => {
    action.list.mockResolvedValue(page([]))
    renderView(<ExploreView viewerId={null} />)

    expect(
      await screen.findByText('No creators to show yet')
    ).toBeInTheDocument()
  })

  it('renders an error with a retry instead of an empty list', async () => {
    action.list.mockResolvedValueOnce({ ok: false, status: 500 })
    action.list.mockResolvedValueOnce(page([creator(4, { alias: 'dana' })]))
    const user = userEvent.setup()
    renderView(<ExploreView viewerId={null} />)

    expect(
      await screen.findByText('Creators could not be loaded')
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(
      await screen.findByRole('heading', { level: 2, name: 'dana' })
    ).toBeInTheDocument()
  })

  it('marks the list busy while it loads', () => {
    action.list.mockReturnValue(new Promise(() => {}))
    renderView(<ExploreView viewerId={null} />)

    expect(screen.getByRole('list', { name: 'Loading creators' })).toBeVisible()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('loads the next page on request without repeating a creator', async () => {
    action.list.mockImplementation(async (_viewer, { page: n }) =>
      n === 1
        ? page([creator(1), creator(2)], 2)
        : page([creator(2), creator(3)])
    )
    const user = userEvent.setup()
    renderView(<ExploreView viewerId={42} />)

    await user.click(await screen.findByRole('button', { name: 'Show more' }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'creator3' })
    ).toBeInTheDocument()
    expect(action.list).toHaveBeenLastCalledWith(42, { alias: '', page: 2 })
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull()
  })

  it('offers a retry when the next page fails, keeping the cards', async () => {
    action.list.mockImplementation(async (_viewer, { page: n }) =>
      n === 1 ? page([creator(1)], 2) : { ok: false, status: 503 }
    )
    const user = userEvent.setup()
    renderView(<ExploreView viewerId={null} />)

    await user.click(await screen.findByRole('button', { name: 'Show more' }))

    expect(
      await screen.findByRole('button', { name: 'Try again' })
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { level: 2, name: 'creator1' })
    ).toBeVisible()
  })
})
