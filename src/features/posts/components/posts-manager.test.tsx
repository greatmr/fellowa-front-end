import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OwnerPost } from '@/features/posts/types/post'
import { ApiError } from '@/lib/api/errors'

import { renderWithIntl } from '../../../../test/render'
import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'
import { ownerPost } from '../test/fixtures'

type Mutate = (variables: unknown, options?: Record<string, unknown>) => void

const mocks = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  collections: {} as Record<string, unknown>,
  status: vi.fn<Mutate>(),
  remove: vi.fn<Mutate>(),
  bulk: vi.fn<Mutate>(),
  removeCollection: vi.fn<Mutate>(),
  createCollection: vi.fn<Mutate>(),
  updateCollection: vi.fn<Mutate>(),
  setCollections: vi.fn<Mutate>(),
  assign: vi.fn<Mutate>(),
  refetch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

const mutation = (mutate: Mutate) => ({ isPending: false, mutate })

vi.mock('@/features/posts/api/post-hooks', () => ({
  usePostsQuery: () => mocks.query,
  useCollectionsQuery: () => mocks.collections,
  useSetPostStatusMutation: () => mutation(mocks.status),
  useDeletePostMutation: () => mutation(mocks.remove),
  useBulkPostsMutation: () => mutation(mocks.bulk),
  useDeleteCollectionMutation: () => mutation(mocks.removeCollection),
  useCreateCollectionMutation: () => mutation(mocks.createCollection),
  useUpdateCollectionMutation: () => mutation(mocks.updateCollection),
  useSetPostCollectionsMutation: () => mutation(mocks.setCollections),
  useAssignCollectionsMutation: () => mutation(mocks.assign),
}))
vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}))

const { PostsManager } = await import('./posts-manager')

const messages = { fa, en } as const
const m = en.posts

const published = ownerPost({ id: 1, title: 'Morning notes' })
const draft = ownerPost({
  id: 2,
  title: 'Members essay',
  text: 'The opening, then the rest.',
  isPublic: false,
  publishedAt: null,
  paywallPosition: 11,
  createdAt: '2026-11-21T08:00:00.000Z',
})
const video = ownerPost({ id: 3, title: 'A video', type: 'video' })

/** `OwnerCollection` as BE-CONT-15 sends it (`createdAt`/`updatedAt` unread). */
const podcast = { id: 7, title: 'Podcast', description: null, postCount: 1 }
const course = {
  id: 8,
  title: 'Course',
  description: 'Lessons in order',
  postCount: 0,
}

function collectionsLoaded(data: unknown[] | undefined, isError = false) {
  mocks.collections = {
    data,
    isPending: data === undefined && !isError,
    isError,
    error: isError ? new ApiError({ message: 'x', status: 500 }) : null,
    refetch: vi.fn(),
  }
}

function loaded(data: OwnerPost[]) {
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

const autoDirFields = (root: HTMLElement) =>
  root.querySelectorAll('input[dir="auto"], textarea[dir="auto"]')

describe('PostsManager', () => {
  beforeEach(() => {
    loaded([published, { ...draft, collectionIds: [7] }, video])
    collectionsLoaded([podcast, course])
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
          name: messages[locale].panel.pages.posts.title,
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

  it('shows the four tabs with counts from the lists', async () => {
    const user = userEvent.setup()
    renderManager()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      `${m.list.tabs.all}3`,
      `${m.list.tabs.published}2`,
      `${m.list.tabs.draft}1`,
      `${m.list.tabs.collections}2`,
    ])
    await user.click(screen.getByRole('tab', { name: /Drafts/ }))
    expect(screen.getByText('Members essay')).toBeInTheDocument()
    expect(screen.queryByText('Morning notes')).not.toBeInTheDocument()
  })

  it('shows access and status from the owner’s own choices, and edit for every composer type (FE-POST-02)', () => {
    renderManager()
    const essay = row('Members essay')
    expect(within(essay).getByText(m.list.badge.tiers)).toBeInTheDocument()
    expect(within(essay).getByText(m.list.badge.paywall)).toBeInTheDocument()
    expect(within(essay).getByText(m.list.badge.draft)).toBeInTheDocument()
    expect(
      within(essay).getByRole('link', {
        name: m.list.editTitle.replace('{title}', 'Members essay'),
      })
    ).toHaveAttribute('href', '/posts/2/edit')
    const notes = row('Morning notes')
    expect(within(notes).getByText(m.list.badge.free)).toBeInTheDocument()
    expect(within(notes).getByText(m.list.badge.published)).toBeInTheDocument()
    expect(
      within(row('A video')).getByRole('link', {
        name: m.list.editTitle.replace('{title}', 'A video'),
      })
    ).toHaveAttribute('href', '/posts/3/edit')
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
    ).toHaveAttribute('href', '/posts/new')
    // The design's second button opens the collections tab (:510-513).
    await user.click(
      screen.getByRole('button', { name: m.list.empty.manageCollections })
    )
    expect(
      screen.getByRole('tab', { name: new RegExp(m.list.tabs.collections) })
    ).toHaveAttribute('aria-selected', 'true')
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

  describe('collections (FE-POST-04, BE-CONT-15)', () => {
    const tab = () =>
      screen.getByRole('tab', { name: new RegExp(m.list.tabs.collections) })
    const c = m.collections

    it('shows each collection with its count, and views its posts under a banner', async () => {
      const user = userEvent.setup()
      renderManager()
      await user.click(tab())
      const cards = screen.getAllByRole('listitem')
      expect(cards).toHaveLength(2)
      expect(cards[0]).toHaveTextContent('Podcast')
      expect(cards[0]).toHaveTextContent('1 post')
      expect(cards[0]).toHaveTextContent(c.noDescription)
      expect(cards[1]).toHaveTextContent('Lessons in order')
      await user.click(
        within(cards[0]!).getByRole('button', { name: c.viewPosts })
      )
      expect(
        screen.getByRole('tab', { name: new RegExp(m.list.tabs.all) })
      ).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('Members essay')).toBeInTheDocument()
      expect(screen.queryByText('Morning notes')).not.toBeInTheDocument()
      expect(screen.getByText('“Podcast”')).toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: m.list.banner.clear })
      )
      expect(screen.getByText('Morning notes')).toBeInTheDocument()
      expect(screen.queryByText('“Podcast”')).not.toBeInTheDocument()
    })

    it('filters to posts in no collection', async () => {
      const user = userEvent.setup()
      renderManager()
      await user.click(
        screen.getByRole('combobox', { name: m.list.collectionLabel })
      )
      await user.click(
        screen.getByRole('option', { name: m.list.collection.none })
      )
      expect(screen.getByText('Morning notes')).toBeInTheDocument()
      expect(screen.queryByText('Members essay')).not.toBeInTheDocument()
    })

    it('renders the empty, loading and error states of the tab', async () => {
      const user = userEvent.setup()
      collectionsLoaded([])
      const first = renderManager()
      await user.click(tab())
      expect(screen.getByText(c.empty.title)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: c.empty.create })
      ).toBeInTheDocument()
      first.unmount()

      collectionsLoaded(undefined)
      const second = renderManager()
      await user.click(
        screen.getByRole('tab', { name: m.list.tabs.collections })
      )
      expect(screen.getByRole('status')).toHaveTextContent(c.loading)
      second.unmount()

      collectionsLoaded(undefined, true)
      renderManager()
      await user.click(
        screen.getByRole('tab', { name: m.list.tabs.collections })
      )
      expect(screen.getByText(c.loadError)).toBeInTheDocument()
    })

    it('deletes a collection only after a confirm that says the posts stay', async () => {
      const user = userEvent.setup()
      renderManager()
      await user.click(tab())
      await user.click(
        screen.getByRole('button', {
          name: c.deleteNamed.replace('{title}', 'Podcast'),
        })
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveTextContent(c.confirmDelete.body)
      expect(mocks.removeCollection).not.toHaveBeenCalled()
      await user.click(
        within(dialog).getByRole('button', { name: c.confirmDelete.confirm })
      )
      const [id, options] = mocks.removeCollection.mock.calls[0]!
      expect(id).toBe(7)
      act(() => (options?.onSuccess as () => void)())
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        c.deletedToast.replace('{title}', 'Podcast')
      )
      // Nothing touches the posts.
      expect(mocks.remove).not.toHaveBeenCalled()
      expect(mocks.bulk).not.toHaveBeenCalled()
    })

    it('replaces one post’s collections from its row', async () => {
      const user = userEvent.setup()
      renderManager()
      const essay = row('Members essay')
      expect(within(essay).getByText('Podcast')).toBeInTheDocument()
      await user.click(
        within(essay).getByRole('button', {
          name: m.list.cell.changeNamed.replace('{title}', 'Members essay'),
        })
      )
      const dialog = screen.getByRole('dialog')
      expect(
        within(dialog).getByRole('checkbox', { name: 'Podcast' })
      ).toBeChecked()
      await user.click(
        within(dialog).getByRole('checkbox', { name: 'Podcast' })
      )
      await user.click(within(dialog).getByRole('checkbox', { name: 'Course' }))
      await user.click(
        within(dialog).getByRole('button', { name: c.assign.save })
      )
      expect(mocks.setCollections.mock.calls[0]![0]).toEqual({
        postId: 2,
        collectionIds: [8],
      })
      expect(mocks.assign).not.toHaveBeenCalled()
    })

    it('creates a collection with its posts, and shows a taken title on the field', async () => {
      const user = userEvent.setup()
      renderManager()
      await user.click(
        screen.getByRole('button', { name: m.list.createCollection })
      )
      const dialog = screen.getByRole('dialog')
      await user.click(
        within(dialog).getByRole('button', { name: c.dialog.create })
      )
      expect(within(dialog).getByRole('alert')).toHaveTextContent(
        c.dialog.titleRequired
      )
      await user.type(
        within(dialog).getByRole('textbox', { name: c.dialog.titleLabel }),
        ' Diaries '
      )
      await user.click(
        within(dialog).getByRole('checkbox', { name: 'Morning notes' })
      )
      await user.click(
        within(dialog).getByRole('button', { name: c.dialog.create })
      )
      const [input, options] = mocks.createCollection.mock.calls[0]!
      expect(input).toEqual({
        title: 'Diaries',
        description: null,
        postIds: [1],
      })
      act(() =>
        (options?.onError as (error: ApiError) => void)(
          new ApiError({
            message: 'x',
            status: 409,
            code: 'CONTENT_COLLECTION_TITLE_TAKEN',
          })
        )
      )
      expect(within(dialog).getByRole('alert')).toHaveTextContent(
        m.errors.collectionTitleTaken
      )
    })

    it('edits a collection without resending an unchanged post set', async () => {
      const user = userEvent.setup()
      renderManager()
      await user.click(tab())
      await user.click(
        within(screen.getAllByRole('listitem')[0]!).getByRole('button', {
          name: c.managePosts,
        })
      )
      const dialog = screen.getByRole('dialog')
      expect(
        within(dialog).getByRole('checkbox', { name: 'Members essay' })
      ).toBeChecked()
      await user.click(
        within(dialog).getByRole('button', { name: c.dialog.save })
      )
      expect(mocks.updateCollection.mock.calls[0]![0]).toEqual({
        collectionId: 7,
        title: 'Podcast',
        description: null,
      })
      await user.click(
        within(dialog).getByRole('checkbox', { name: 'Members essay' })
      )
      await user.click(
        within(dialog).getByRole('button', { name: c.dialog.save })
      )
      expect(mocks.updateCollection.mock.calls[1]![0]).toMatchObject({
        postIds: [],
      })
    })
  })

  it('renders the collections tab, both collection dialogs, the bulk bar and its confirm in fa with no message error', async () => {
    const t = fa.posts
    const user = userEvent.setup()
    renderManager('fa')
    await user.click(screen.getByRole('checkbox', { name: t.list.selectAll }))
    expect(
      screen.getByRole('region', { name: t.bulk.barLabel })
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: t.bulk.delete }))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      t.bulk.confirmDelete.body
    )
    await user.keyboard('{Escape}')
    await user.click(
      screen.getByRole('button', { name: t.bulk.addToCollection })
    )
    expect(screen.getByRole('dialog')).toHaveTextContent(
      t.collections.assign.title
    )
    // FE-I18N-02: typing direction follows the page, never `dir="auto"`.
    expect(autoDirFields(screen.getByRole('dialog'))).toHaveLength(0)
    await user.keyboard('{Escape}')
    await user.click(
      screen.getByRole('button', { name: t.list.createCollection })
    )
    expect(screen.getByRole('dialog')).toHaveTextContent(
      t.collections.dialog.createTitle
    )
    expect(
      within(screen.getByRole('dialog')).getAllByRole('textbox').length
    ).toBeGreaterThanOrEqual(2)
    expect(autoDirFields(screen.getByRole('dialog'))).toHaveLength(0)
    await user.keyboard('{Escape}')
    await user.click(
      screen.getByRole('tab', { name: new RegExp(t.list.tabs.collections) })
    )
    expect(
      screen.getAllByRole('button', { name: t.collections.managePosts })
    ).toHaveLength(2)
  })

  describe('bulk actions (FQ-30 (5), reversed)', () => {
    const b = m.bulk
    const check = (title: string) =>
      within(row(title)).getByRole('checkbox', {
        name: m.list.selectRow.replace('{title}', title),
      })

    it('adds the selected posts to collections, never removing any', async () => {
      const user = userEvent.setup()
      renderManager()
      await user.click(check('Morning notes'))
      await user.click(check('A video'))
      expect(screen.getByText('2 posts selected')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: b.addToCollection }))
      const dialog = screen.getByRole('dialog')
      await user.click(
        within(dialog).getByRole('button', { name: m.collections.assign.save })
      )
      expect(within(dialog).getByRole('alert')).toHaveTextContent(
        m.collections.assign.pickOne
      )
      await user.click(within(dialog).getByRole('checkbox', { name: 'Course' }))
      await user.click(
        within(dialog).getByRole('button', { name: m.collections.assign.save })
      )
      const [input, options] = mocks.assign.mock.calls[0]!
      expect(input).toEqual({ postIds: [1, 3], collectionIds: [8] })
      expect(mocks.setCollections).not.toHaveBeenCalled()
      act(() => (options?.onSuccess as () => void)())
      expect(check('Morning notes')).not.toBeChecked()
    })

    it('deletes after one confirm, shows progress, and keeps only the failed posts selected with why', async () => {
      const user = userEvent.setup()
      renderManager()
      await user.click(screen.getByRole('checkbox', { name: m.list.selectAll }))
      await user.click(screen.getByRole('button', { name: b.delete }))
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveTextContent('Delete 3 posts?')
      expect(mocks.bulk).not.toHaveBeenCalled()
      await user.click(
        within(dialog).getByRole('button', { name: b.confirmDelete.confirm })
      )
      const [variables, options] = mocks.bulk.mock.calls[0]! as [
        {
          action: string
          posts: OwnerPost[]
          onProgress: (p: { done: number; total: number }) => void
        },
        Record<string, unknown>,
      ]
      expect(variables.action).toBe('delete')
      expect(variables.posts.map((post) => post.id)).toEqual([2, 1, 3])
      act(() => variables.onProgress({ done: 1, total: 3 }))
      expect(screen.getByRole('status')).toHaveTextContent('Deleting 1 of 3…')
      act(() => {
        ;(options.onSuccess as (outcomes: unknown) => void)([
          { item: variables.posts[0], error: null },
          { item: variables.posts[1], error: null },
          {
            item: variables.posts[2],
            error: new ApiError({
              message: 'x',
              status: 404,
              code: 'CONTENT_NOT_FOUND',
            }),
          },
        ])
        ;(options.onSettled as () => void)()
      })
      const summary = screen.getByRole('alert')
      expect(summary).toHaveTextContent('2 of 3 done; 1 failed:')
      expect(summary).toHaveTextContent(`A video: ${m.errors.notFound}`)
      expect(check('A video')).toBeChecked()
      expect(check('Morning notes')).not.toBeChecked()
      expect(mocks.toastSuccess).not.toHaveBeenCalled()
    })

    it('keeps the failed posts selected even after a tab change during the run', async () => {
      const user = userEvent.setup()
      renderManager()
      await user.click(check('Morning notes'))
      await user.click(screen.getByRole('button', { name: b.delete }))
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: b.confirmDelete.confirm,
        })
      )
      const [variables, options] = mocks.bulk.mock.calls[0]! as [
        { posts: OwnerPost[] },
        Record<string, unknown>,
      ]
      await user.click(screen.getByRole('tab', { name: /Published/ }))
      act(() => {
        ;(options.onSuccess as (outcomes: unknown) => void)([
          {
            item: variables.posts[0],
            error: new ApiError({ message: 'x', isNetworkError: true }),
          },
        ])
        ;(options.onSettled as () => void)()
      })
      expect(check('Morning notes')).toBeChecked()
    })

    it('publishes only the selected drafts, without a confirm', async () => {
      const user = userEvent.setup()
      renderManager()
      await user.click(screen.getByRole('checkbox', { name: m.list.selectAll }))
      await user.click(
        within(screen.getByRole('region', { name: b.barLabel })).getByRole(
          'button',
          { name: b.publish }
        )
      )
      const [variables, options] = mocks.bulk.mock.calls[0]! as [
        { action: string; posts: OwnerPost[] },
        Record<string, unknown>,
      ]
      expect(variables.action).toBe('publish')
      expect(variables.posts.map((post) => post.id)).toEqual([2])
      act(() => {
        ;(options.onSuccess as (outcomes: unknown) => void)([
          { item: variables.posts[0], error: null },
        ])
        ;(options.onSettled as () => void)()
      })
      expect(mocks.toastSuccess).toHaveBeenCalledWith('1 post published')
    })

    it('moves the selected published posts to drafts after a confirm', async () => {
      const user = userEvent.setup()
      renderManager()
      await user.click(check('Morning notes'))
      await user.click(check('Members essay'))
      await user.click(screen.getByRole('button', { name: b.draft }))
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveTextContent('Move 1 post back to drafts?')
      await user.click(
        within(dialog).getByRole('button', {
          name: b.confirmUnpublish.confirm,
        })
      )
      const [variables] = mocks.bulk.mock.calls[0]! as [
        { action: string; posts: OwnerPost[] },
      ]
      expect(variables.action).toBe('draft')
      expect(variables.posts.map((post) => post.id)).toEqual([1])
    })

    it('clears the selection on a tab change and on cancel', async () => {
      const user = userEvent.setup()
      renderManager()
      await user.click(check('Morning notes'))
      await user.click(screen.getByRole('button', { name: b.cancel }))
      expect(
        screen.queryByRole('region', { name: b.barLabel })
      ).not.toBeInTheDocument()
      await user.click(check('Morning notes'))
      await user.click(screen.getByRole('tab', { name: /Published/ }))
      expect(check('Morning notes')).not.toBeChecked()
    })
  })
})
