import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StudioPost } from '@/features/posts/types/post'
import { ApiError } from '@/lib/api/errors'

import { renderWithIntl } from '../../../../test/render'
import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'
import { studioPost } from '../test/fixtures'

type Mutate = (variables: unknown, options?: Record<string, unknown>) => void

const mocks = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  status: vi.fn<Mutate>(),
  remove: vi.fn<Mutate>(),
  refetch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

const mutation = (mutate: Mutate) => ({ isPending: false, mutate })

vi.mock('@/features/posts/api/post-hooks', () => ({
  usePostsQuery: () => mocks.query,
  useSetPostStatusMutation: () => mutation(mocks.status),
  useDeletePostMutation: () => mutation(mocks.remove),
}))
vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}))

const { PostsManager } = await import('./posts-manager')

const messages = { fa, en } as const
const m = en.posts

const published = studioPost({ id: 1, title: 'Morning notes' })
const draft = studioPost({
  id: 2,
  title: 'Members essay',
  text: 'The opening, then the rest.',
  isPublic: false,
  publishedAt: null,
  paywallPosition: 11,
  createdAt: '2026-11-21T08:00:00.000Z',
})
const video = studioPost({ id: 3, title: 'A video', type: 'video' })

function loaded(data: StudioPost[]) {
  mocks.query = {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: mocks.refetch,
  }
}

function renderManager(locale: keyof typeof messages = 'en') {
  return renderWithIntl(<PostsManager viewerId={4} />, {
    locale,
    strict: true,
  })
}

const row = (title: string) =>
  screen.getByRole('row', { name: new RegExp(title) })

describe('PostsManager', () => {
  beforeEach(() => {
    loaded([published, draft, video])
    for (const fn of Object.values(mocks)) {
      if (typeof fn === 'function' && 'mockReset' in fn) fn.mockReset()
    }
  })

  it.each(['fa', 'en'] as const)(
    'renders the list, filters and both dialogs in %s with no message error',
    async (locale) => {
      const t = messages[locale].posts
      const user = userEvent.setup()
      renderManager(locale)
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: messages[locale].studio.pages.posts.title,
        })
      ).toBeInTheDocument()
      await user.click(
        screen.getAllByRole('button', { name: t.list.unpublish })[0]!
      )
      expect(screen.getByRole('dialog')).toHaveTextContent(
        t.confirmUnpublish.body
      )
      await user.keyboard('{Escape}')
      await user.click(
        screen.getByRole('button', {
          name: t.list.deleteNamed.replace('{title}', 'Members essay'),
        })
      )
      expect(screen.getByRole('dialog')).toHaveTextContent(t.confirmDelete.body)
    }
  )

  it('shows the three tabs with counts from the list, and no collections', async () => {
    const user = userEvent.setup()
    renderManager()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      `${m.list.tabs.all}3`,
      `${m.list.tabs.published}2`,
      `${m.list.tabs.draft}1`,
    ])
    expect(screen.queryByText(/collection/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Drafts/ }))
    expect(screen.getByText('Members essay')).toBeInTheDocument()
    expect(screen.queryByText('Morning notes')).not.toBeInTheDocument()
  })

  it('shows access and status from the owner’s own choices, and edit only for text and image', () => {
    renderManager()
    const essay = row('Members essay')
    expect(within(essay).getByText(m.list.badge.tiers)).toBeInTheDocument()
    expect(within(essay).getByText(m.list.badge.paywall)).toBeInTheDocument()
    expect(within(essay).getByText(m.list.badge.draft)).toBeInTheDocument()
    expect(
      within(essay).getByRole('link', {
        name: m.list.editTitle.replace('{title}', 'Members essay'),
      })
    ).toHaveAttribute('href', '/studio/posts/2/edit')
    const notes = row('Morning notes')
    expect(within(notes).getByText(m.list.badge.free)).toBeInTheDocument()
    expect(within(notes).getByText(m.list.badge.published)).toBeInTheDocument()
    expect(
      within(row('A video')).queryByRole('link', { name: /Edit/ })
    ).not.toBeInTheDocument()
  })

  it('searches, filters by access and clears the filters, client side', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.type(
      screen.getByRole('searchbox', { name: m.list.searchLabel }),
      'opening'
    )
    expect(screen.getByText('Members essay')).toBeInTheDocument()
    expect(screen.queryByText('Morning notes')).not.toBeInTheDocument()
    await user.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByText(m.list.noMatch.title)).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: m.list.noMatch.action })
    )
    expect(screen.getByText('Morning notes')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: m.list.accessLabel }))
    await user.click(screen.getByRole('option', { name: m.list.access.locked }))
    expect(screen.queryByText('Morning notes')).not.toBeInTheDocument()
    expect(screen.getByText('Members essay')).toBeInTheDocument()
  })

  it('publishes a draft with the same PUT and its title, and shows a server refusal', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(
      within(row('Members essay')).getByRole('button', { name: m.list.publish })
    )
    const [variables, options] = mocks.status.mock.calls[0]!
    expect(variables).toEqual({
      postId: 2,
      title: 'Members essay',
      visibility: { type: false },
    })
    ;(options?.onError as (error: ApiError) => void)(
      new ApiError({ message: 'x', status: 400, code: 'CONTENT_TIER_REQUIRED' })
    )
    expect(mocks.toastError).toHaveBeenCalledWith(m.errors.tierRequired)
  })

  it('unpublishes only after confirming, and keeps the dialog open with the error on failure', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(
      within(row('Morning notes')).getByRole('button', {
        name: m.list.unpublish,
      })
    )
    expect(mocks.status).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', { name: m.confirmUnpublish.confirm })
    )
    const [variables, options] = mocks.status.mock.calls[0]!
    expect(variables).toEqual({
      postId: 1,
      title: 'Morning notes',
      visibility: { type: true, isDraft: true },
    })
    ;(options?.onError as (error: ApiError) => void)(
      new ApiError({ message: 'x', isNetworkError: true })
    )
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      m.errors.network
    )
    ;(options?.onSuccess as () => void)()
    expect(mocks.toastSuccess).toHaveBeenCalledWith(m.list.unpublishedToast)
  })

  it('deletes after confirming', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(
      screen.getByRole('button', {
        name: m.list.deleteNamed.replace('{title}', 'Morning notes'),
      })
    )
    await user.click(
      screen.getByRole('button', { name: m.confirmDelete.confirm })
    )
    expect(mocks.remove.mock.calls[0]![0]).toBe(1)
  })

  it('renders the empty, no-drafts, loading and error states', async () => {
    const user = userEvent.setup()
    loaded([])
    const { unmount } = renderManager()
    expect(screen.getByText(m.list.empty.title)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: m.list.empty.action })
    ).toHaveAttribute('href', '/studio/posts/new')
    unmount()

    loaded([published])
    const second = renderManager()
    await user.click(screen.getByRole('tab', { name: /Drafts/ }))
    expect(screen.getByText(m.list.noDrafts.title)).toBeInTheDocument()
    second.unmount()

    mocks.query = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    }
    const third = renderManager()
    expect(screen.getByRole('status')).toHaveTextContent(en.common.loading)
    third.unmount()

    mocks.query = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiError({ message: 'x', status: 500 }),
      refetch: mocks.refetch,
    }
    renderManager()
    expect(screen.getByText(m.list.loadError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: en.common.retry }))
    expect(mocks.refetch).toHaveBeenCalled()
  })
})
