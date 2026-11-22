import { useState } from 'react'
import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as I18nNavigation from '@/i18n/navigation'
import type { RichParts } from '@/features/posts/lib/rich-editor'
import type { OwnerPost } from '@/features/posts/types/post'
import { ApiError } from '@/lib/api/errors'

import { renderWithIntl } from '../../../../test/render'
import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'
import { ownerPost } from '../test/fixtures'

type Mutate = (variables: unknown, options?: Record<string, unknown>) => void

const mocks = vi.hoisted(() => ({
  save: vi.fn<Mutate>(),
  upload: vi.fn<Mutate>(),
  removeImage: vi.fn<Mutate>(),
  uploadMedia: vi.fn<Mutate>(),
  uploadAttachment: vi.fn<(variables: unknown) => Promise<unknown>>(),
  mediaPending: false,
  push: vi.fn(),
  replace: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  tiers: {} as Record<string, unknown>,
  collections: {} as Record<string, unknown>,
  setCollections: vi.fn<(variables: unknown) => Promise<unknown>>(),
  createCollection: vi.fn<Mutate>(),
}))

const mutation = (mutate: Mutate) => ({ isPending: false, mutate })

vi.mock('@/features/posts/api/post-hooks', () => ({
  postKeys: {
    mutation: (name: string, viewerId: number) => [
      'posts',
      'mutation',
      name,
      viewerId,
    ],
  },
  useSavePostMutation: () => mutation(mocks.save),
  useUploadPostImageMutation: () => mutation(mocks.upload),
  useDeletePostImageMutation: () => mutation(mocks.removeImage),
  useUploadPostMediaMutation: () => ({
    isPending: mocks.mediaPending,
    mutate: mocks.uploadMedia,
  }),
  useUploadPostAttachmentMutation: () => ({
    isPending: false,
    mutateAsync: mocks.uploadAttachment,
  }),
  useDeletePostAttachmentMutation: () => mutation(vi.fn()),
  useCollectionsQuery: () => mocks.collections,
  useCreateCollectionMutation: () => mutation(mocks.createCollection),
  useSetPostCollectionsMutation: () => ({
    isPending: false,
    mutateAsync: mocks.setCollections,
  }),
}))
vi.mock('@/features/tiers/client', () => ({ useTiersQuery: () => mocks.tiers }))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nNavigation>()),
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}))
vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}))

/**
 * A stand-in for the Tiptap editor, which the composer loads with
 * `next/dynamic`: it shows the two HTML parts the editor would report and
 * lets a test set them. The real editor is covered by
 * `post-body-editor.test.tsx` and `lib/rich-editor.test.ts`.
 */
function FakeBodyEditor({
  initial,
  editable,
  onChange,
}: {
  initial: RichParts
  editable: boolean
  onChange: (parts: RichParts) => void
}) {
  const [parts, setParts] = useState(initial)
  const update = (next: RichParts) => {
    setParts(next)
    onChange(next)
  }
  return (
    <div>
      <textarea
        aria-label="fake body"
        disabled={!editable}
        value={parts.before}
        onChange={(event) => update({ ...parts, before: event.target.value })}
      />
      {parts.after === null ? (
        <button
          type="button"
          onClick={() => update({ before: parts.before, after: '' })}
        >
          fake divider
        </button>
      ) : (
        <>
          <textarea
            aria-label="fake after"
            value={parts.after}
            onChange={(event) =>
              update({ ...parts, after: event.target.value })
            }
          />
          <button
            type="button"
            onClick={() =>
              update({
                before: parts.before + (parts.after ?? ''),
                after: null,
              })
            }
          >
            fake remove divider
          </button>
        </>
      )}
    </div>
  )
}
vi.mock('next/dynamic', () => ({ default: () => FakeBodyEditor }))

const { PostComposer } = await import('./post-composer')

const messages = { fa, en } as const
const c = en.posts.composer

const tier = (id: number, title: string) => ({ id, title })

function renderComposer(
  saved: OwnerPost | null = null,
  locale: keyof typeof messages = 'en'
) {
  const client = new QueryClient()
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <PostComposer viewerId={4} saved={saved} />
    </QueryClientProvider>,
    { locale, strict: true }
  )
}

const lastSave = () => mocks.save.mock.calls.at(-1)!
const title = () => screen.getByRole('textbox', { name: c.titleLabel })
const body = () =>
  screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'fake body' })
const after = () =>
  screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'fake after' })

describe('PostComposer', () => {
  beforeEach(() => {
    for (const fn of [
      mocks.save,
      mocks.upload,
      mocks.removeImage,
      mocks.uploadMedia,
      mocks.uploadAttachment,
      mocks.push,
      mocks.replace,
      mocks.toastSuccess,
      mocks.toastError,
      mocks.setCollections,
      mocks.createCollection,
    ]) {
      fn.mockReset()
    }
    mocks.collections = {
      isPending: false,
      isError: false,
      data: [
        { id: 7, title: 'Podcast', description: null, postCount: 2 },
        { id: 8, title: 'Course', description: 'Lessons', postCount: 0 },
      ],
      refetch: vi.fn(),
    }
    mocks.mediaPending = false
    mocks.tiers = {
      isPending: false,
      isError: false,
      data: [tier(3, 'Bronze'), tier(5, 'Gold')],
      refetch: vi.fn(),
    }
  })

  it.each(['fa', 'en'] as const)(
    'renders create and edit with the divider and tiers in %s with no message error',
    async (locale) => {
      const t = messages[locale].posts.composer
      const user = userEvent.setup()
      const { unmount } = renderComposer(null, locale)
      await user.click(screen.getByRole('button', { name: 'fake divider' }))
      await user.click(
        screen.getByRole('radio', { name: new RegExp(t.access.tiers) })
      )
      expect(screen.getByText(t.access.laterTiersNote)).toBeInTheDocument()
      // FE-POST-05: the paperclip works before the first save.
      expect(
        screen.getByRole('button', { name: t.attachments.add })
      ).toBeEnabled()
      unmount()
      renderComposer(ownerPost({ isPublic: false, paywallPosition: 3 }), locale)
      expect(screen.getByText(t.access.keepTitle)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: t.saveChanges })
      ).toBeInTheDocument()
    }
  )

  it('renders no single-post purchase or schedule controls (FQ-31, FQ-30)', () => {
    renderComposer()
    for (const text of [/purchase/i, /schedule/i]) {
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('sends the ticked collections after the first save, then moves on (FE-POST-04)', async () => {
    const user = userEvent.setup()
    mocks.setCollections.mockResolvedValue({ postId: 12, collectionIds: [8] })
    renderComposer()
    await user.type(title(), 'Hello')
    await user.click(screen.getByRole('checkbox', { name: 'Course' }))
    await user.click(screen.getByRole('button', { name: c.publish }))
    // Create and update take no collectionIds (BE-CONT-15).
    expect(lastSave()[0]).not.toHaveProperty('payload.collectionIds')
    await act(async () => {
      ;(lastSave()[1]?.onSuccess as (post: OwnerPost) => void)(
        ownerPost({ id: 12 })
      )
    })
    expect(mocks.setCollections).toHaveBeenCalledWith({
      postId: 12,
      collectionIds: [8],
    })
    expect(mocks.push).toHaveBeenCalledWith('/posts')
  })

  it('leaves the collections alone when they did not change', async () => {
    const user = userEvent.setup()
    renderComposer(ownerPost({ collectionIds: [7] }))
    expect(screen.getByRole('checkbox', { name: 'Podcast' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: c.saveChanges }))
    ;(lastSave()[1]?.onSuccess as (post: OwnerPost) => void)(
      ownerPost({ collectionIds: [7] })
    )
    expect(mocks.setCollections).not.toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledWith('/posts')
  })

  it('reports a failed collections write without undoing the save', async () => {
    const user = userEvent.setup()
    mocks.setCollections.mockRejectedValue(
      new ApiError({
        message: 'x',
        status: 404,
        code: 'CONTENT_COLLECTION_NOT_FOUND',
      })
    )
    renderComposer(ownerPost({ collectionIds: [7] }))
    await user.click(screen.getByRole('checkbox', { name: 'Podcast' }))
    await user.click(screen.getByRole('button', { name: c.saveChanges }))
    await act(async () => {
      ;(lastSave()[1]?.onSuccess as (post: OwnerPost) => void)(
        ownerPost({ collectionIds: [7] })
      )
    })
    expect(mocks.setCollections).toHaveBeenCalledWith({
      postId: 12,
      collectionIds: [],
    })
    expect(mocks.toastError).toHaveBeenCalledWith(
      c.collections.syncFailed.replace(
        '{reason}',
        en.posts.errors.collectionNotFound
      )
    )
    expect(mocks.push).toHaveBeenCalledWith('/posts')
  })

  it('drops a collection deleted meanwhile instead of failing every save', async () => {
    const user = userEvent.setup()
    // 99 was deleted: the server no longer lists it nor holds the link.
    renderComposer(ownerPost({ collectionIds: [7, 99] }))
    await user.click(screen.getByRole('button', { name: c.saveChanges }))
    ;(lastSave()[1]?.onSuccess as (post: OwnerPost) => void)(
      ownerPost({ collectionIds: [7] })
    )
    expect(mocks.setCollections).not.toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledWith('/posts')
  })

  it('says only that the session ended when it ends during the collections write', async () => {
    const user = userEvent.setup()
    mocks.setCollections.mockRejectedValue(
      new ApiError({ message: 'x', status: 401 })
    )
    renderComposer(ownerPost({ collectionIds: [] }))
    await user.click(screen.getByRole('checkbox', { name: 'Podcast' }))
    await user.click(screen.getByRole('button', { name: c.saveChanges }))
    await act(async () => {
      ;(lastSave()[1]?.onSuccess as (post: OwnerPost) => void)(ownerPost())
    })
    expect(mocks.toastError).toHaveBeenCalledWith(
      en.posts.errors.sessionExpired
    )
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('creates a collection on the spot and ticks it', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.click(screen.getByRole('button', { name: c.collections.new }))
    await user.type(
      screen.getByRole('textbox', { name: c.collections.newLabel }),
      ' Diaries '
    )
    await user.click(screen.getByRole('button', { name: c.collections.add }))
    const [input, options] = mocks.createCollection.mock.calls.at(-1)!
    expect(input).toEqual({ title: 'Diaries', description: null })
    act(() => {
      ;(options?.onSuccess as (c: unknown) => void)({
        id: 9,
        title: 'Diaries',
        description: null,
        postCount: 0,
      })
    })
    expect(
      screen.queryByRole('textbox', { name: c.collections.newLabel })
    ).not.toBeInTheDocument()
  })

  it('needs a title before saving', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.click(screen.getByRole('button', { name: c.saveDraft }))
    expect(screen.getByRole('alert')).toHaveTextContent(c.titleRequired)
    expect(title()).toHaveAttribute('aria-invalid', 'true')
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('publishes a free text post and returns to the list', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(title(), 'Hello')
    fireEvent.change(body(), { target: { value: '<p dir="auto">Body</p>' } })
    await user.click(screen.getByRole('button', { name: c.publish }))
    const [input, options] = lastSave()
    expect(input).toEqual({
      kind: 'text',
      payload: {
        title: 'Hello',
        text: '<p dir="auto">Body</p>',
        bodyFormat: 'html',
        paywallPosition: null,
        tireIds: [],
        visibility: { type: true },
      },
    })
    ;(options?.onSuccess as (post: OwnerPost) => void)(ownerPost())
    expect(mocks.toastSuccess).toHaveBeenCalledWith(c.publishedToast)
    expect(mocks.push).toHaveBeenCalledWith('/posts')
  })

  it('sends the divider as the index of the first gated block (Q-83)', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(title(), 'T')
    fireEvent.change(body(), {
      target: { value: '<h2 dir="auto">سلام</h2><ul><li><p>😀</p></li></ul>' },
    })
    await user.click(screen.getByRole('button', { name: 'fake divider' }))
    fireEvent.change(after(), { target: { value: '<p dir="auto">بقیه</p>' } })
    await user.click(screen.getByRole('button', { name: c.saveDraft }))
    expect(lastSave()[0]).toMatchObject({
      payload: {
        text: '<h2 dir="auto">سلام</h2><ul><li><p>😀</p></li></ul><p dir="auto">بقیه</p>',
        bodyFormat: 'html',
        paywallPosition: 2,
        visibility: { type: true, isDraft: true },
      },
    })
    ;(lastSave()[1]?.onSettled as () => void)()
    // Removing the divider clears the paywall.
    await user.click(
      screen.getByRole('button', { name: 'fake remove divider' })
    )
    await user.click(screen.getByRole('button', { name: c.saveDraft }))
    expect(lastSave()[0]).toMatchObject({
      payload: { paywallPosition: null, bodyFormat: 'html' },
    })
  })

  it('gates nothing when no block follows the divider', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(title(), 'T')
    fireEvent.change(body(), { target: { value: '<p>a</p>' } })
    await user.click(screen.getByRole('button', { name: 'fake divider' }))
    await user.click(screen.getByRole('button', { name: c.saveDraft }))
    expect(lastSave()[0]).toMatchObject({
      payload: { text: '<p>a</p>', paywallPosition: null },
    })
  })

  it('needs a tier to publish a limited post, offers select all, and lets a draft wait', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(title(), 'Members')
    await user.click(
      screen.getByRole('radio', { name: new RegExp(c.access.tiers) })
    )
    await user.click(screen.getByRole('button', { name: c.publish }))
    expect(screen.getByRole('alert')).toHaveTextContent(c.access.tiersRequired)
    expect(mocks.save).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: c.saveDraft }))
    expect(lastSave()[0]).toMatchObject({
      payload: { tireIds: [], visibility: { type: false, isDraft: true } },
    })
    await user.click(screen.getByRole('button', { name: c.access.selectAll }))
    expect(
      screen.queryByRole('button', { name: c.access.selectAll })
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Bronze' }))
    await user.click(screen.getByRole('button', { name: c.publish }))
    expect(lastSave()[0]).toMatchObject({
      payload: { tireIds: [5], visibility: { type: false } },
    })
  })

  it('shows the server’s O-4 refusal on the tiers and the no-page notice', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(title(), 'X')
    await user.click(
      screen.getByRole('radio', { name: new RegExp(c.access.tiers) })
    )
    await user.click(screen.getByRole('checkbox', { name: 'Gold' }))
    await user.click(screen.getByRole('button', { name: c.publish }))
    const onError = lastSave()[1]?.onError as (error: ApiError) => void
    onError(
      new ApiError({ message: 'x', status: 400, code: 'CONTENT_TIER_REQUIRED' })
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.posts.errors.tierRequired
    )
    onError(
      new ApiError({ message: 'x', status: 400, code: 'USER_ALIAS_REQUIRED' })
    )
    expect(
      await screen.findByText(en.posts.aliasRequired.title)
    ).toBeInTheDocument()
    onError(new ApiError({ message: 'x', status: 500 }))
    expect(await screen.findByText(en.posts.errors.generic)).toBeInTheDocument()
  })

  it('stays disabled after a successful save while the route changes', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(title(), 'Once')
    await user.click(screen.getByRole('button', { name: c.publish }))
    const options = lastSave()[1]
    ;(options?.onSuccess as (post: OwnerPost) => void)(ownerPost())
    ;(options?.onSettled as () => void)()
    expect(
      await screen.findByRole('button', { name: c.publish })
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: c.saveDraft })).toBeDisabled()
    expect(mocks.save).toHaveBeenCalledTimes(1)
  })

  it('stops offering "keep" once a limited post is saved as free', async () => {
    const user = userEvent.setup()
    renderComposer(ownerPost({ isPublic: false, publishedAt: null }))
    await user.click(
      screen.getByRole('radio', { name: new RegExp(c.access.free) })
    )
    await user.click(screen.getByRole('button', { name: c.saveDraft }))
    const options = lastSave()[1]
    ;(options?.onSuccess as (post: OwnerPost) => void)(
      ownerPost({ isPublic: true, publishedAt: null })
    )
    ;(options?.onSettled as () => void)()
    await user.click(
      screen.getByRole('radio', { name: new RegExp(c.access.tiers) })
    )
    expect(screen.queryByText(c.access.keepTitle)).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Gold' })).toBeInTheDocument()
  })

  it('goes to the edit page after the first draft save', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(title(), 'Draft')
    await user.click(screen.getByRole('button', { name: c.saveDraft }))
    ;(lastSave()[1]?.onSuccess as (post: OwnerPost) => void)(
      ownerPost({ id: 77, publishedAt: null })
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith(c.draftToast)
    expect(mocks.replace).toHaveBeenCalledWith('/posts/77/edit')
  })

  it('edits a limited post: keeps its tiers and date, resends the paywall', async () => {
    const user = userEvent.setup()
    renderComposer(
      ownerPost({
        text: '<p dir="auto">باز</p><p dir="auto">قفل</p>',
        bodyFormat: 'html',
        paywallPosition: 1,
        isPublic: false,
      })
    )
    expect(body()).toHaveValue('<p dir="auto">باز</p>')
    expect(after()).toHaveValue('<p dir="auto">قفل</p>')
    expect(screen.queryByText(c.plainConversionNote)).not.toBeInTheDocument()
    fireEvent.change(after(), {
      target: { value: '<p dir="auto">قفل</p><p>e</p>' },
    })
    await user.click(screen.getByRole('button', { name: c.saveChanges }))
    const [input, options] = lastSave()
    ;(options?.onSettled as () => void)()
    expect(input).toEqual({
      postId: 12,
      kind: 'text',
      payload: {
        title: 'سلام دنیا',
        text: '<p dir="auto">باز</p><p dir="auto">قفل</p><p>e</p>',
        bodyFormat: 'html',
        paywallPosition: 1,
        visibility: { type: false, datePublished: '2026-11-20T08:00:00.000Z' },
      },
    })
    await user.click(screen.getByRole('button', { name: c.access.choose }))
    await user.click(screen.getByRole('checkbox', { name: 'Gold' }))
    await user.click(screen.getByRole('button', { name: c.saveChanges }))
    expect(lastSave()[0]).toMatchObject({ payload: { tireIds: [5] } })
    expect(screen.getByText(c.moveToDraftHint)).toBeInTheDocument()
  })

  it('converts a plain post on save only: paragraphs, the divider at the matching block, sent as html', async () => {
    const user = userEvent.setup()
    // Offset 7 (Q-19 code points) falls after "یک\n\nدو😀".
    renderComposer(
      ownerPost({
        text: 'یک\n\nدو😀\n\nسه <b>',
        bodyFormat: 'plain',
        paywallPosition: 7,
        isPublic: false,
      })
    )
    expect(screen.getByText(c.plainConversionNote)).toBeInTheDocument()
    expect(body()).toHaveValue('<p>یک</p><p>دو😀</p>')
    expect(after()).toHaveValue('<p>سه &lt;b&gt;</p>')
    // Nothing is written on open.
    expect(mocks.save).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: c.saveChanges }))
    expect(lastSave()[0]).toMatchObject({
      payload: {
        text: '<p>یک</p><p>دو😀</p><p>سه &lt;b&gt;</p>',
        // A format change on a paywalled post must carry the position.
        bodyFormat: 'html',
        paywallPosition: 2,
      },
    })
  })

  it('uploads a picked image, refuses another type, and saves an image post', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderComposer()
    await user.type(title(), 'Gallery')
    await user.click(screen.getByRole('button', { name: c.mediaChoice.image }))
    const input = screen.getByTestId('post-image-input')
    await user.upload(
      input,
      new File(['x'], 'a.svg', { type: 'image/svg+xml' })
    )
    expect(screen.getByRole('alert')).toHaveTextContent(c.images.typeError)
    expect(mocks.upload).not.toHaveBeenCalled()
    await user.upload(input, new File(['x'], 'a.png', { type: 'image/png' }))
    const [file, options] = mocks.upload.mock.calls[0]!
    expect(file).toBeInstanceOf(File)
    ;(options?.onSuccess as (image: unknown) => void)({
      id: 40,
      url: 'https://cdn.example/a.png',
    })
    expect(
      await screen.findByRole('img', { name: 'Image 1' })
    ).toBeInTheDocument()
    expect(screen.getByText(c.images.pendingNote)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: c.publish }))
    expect(lastSave()[0]).toMatchObject({
      kind: 'image',
      payload: { imageIds: [40] },
    })
  })

  it('deletes a saved image on the server and drops a new one locally', async () => {
    const user = userEvent.setup()
    renderComposer(
      ownerPost({
        type: 'image',
        images: [{ id: 9, url: 'https://cdn.example/s.png' }],
      })
    )
    // The gallery, not the collections list (FE-POST-04).
    const gallery = screen
      .getAllByRole('list')
      .find((list) => !list.hasAttribute('aria-label'))!
    await user.click(
      within(gallery).getByRole('button', { name: 'Delete image 1' })
    )
    expect(mocks.removeImage.mock.calls[0]![0]).toBe(9)
    ;(mocks.removeImage.mock.calls[0]![1]?.onSuccess as () => void)()
    expect(
      await screen.findByRole('button', { name: c.images.add })
    ).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  describe('upload failures (FE-POST-05)', () => {
    const png = () => new File(['x'], 'a.png', { type: 'image/png' })

    it.each([
      [503, 'INTEGRATION_NOT_CONFIGURED', c.images.unavailable],
      [500, undefined, c.uploadErrors.storage],
      [413, 'UPLOAD_TOO_LARGE', c.images.sizeError],
      [415, 'UPLOAD_TYPE_NOT_ALLOWED', c.images.typeError],
      [403, 'INVALID_REQUEST', c.uploadErrors.requestRefused],
      [403, undefined, c.uploadErrors.accountRefused],
      [400, 'INVALID_REQUEST', c.images.uploadError],
    ] as const)(
      'explains an image upload answered %i %s',
      async (status, code, message) => {
        const user = userEvent.setup()
        renderComposer()
        await user.click(
          screen.getByRole('button', { name: c.mediaChoice.image })
        )
        await user.upload(screen.getByTestId('post-image-input'), png())
        const onError = mocks.upload.mock.calls[0]![1]?.onError as (
          error: ApiError
        ) => void
        act(() => onError(new ApiError({ message: 'x', status, code })))
        expect(await screen.findByRole('alert')).toHaveTextContent(message)
      }
    )

    it('turns an image 401 into the toast and the alias code into the notice', async () => {
      const user = userEvent.setup()
      renderComposer()
      await user.click(
        screen.getByRole('button', { name: c.mediaChoice.image })
      )
      await user.upload(screen.getByTestId('post-image-input'), png())
      await user.upload(screen.getByTestId('post-image-input'), png())
      const [first, second] = mocks.upload.mock.calls.map(
        (call) => call[1]?.onError as (error: ApiError) => void
      )
      act(() => first!(new ApiError({ message: 'x', status: 401 })))
      expect(mocks.toastError).toHaveBeenCalledWith(
        en.posts.errors.sessionExpired
      )
      act(() =>
        second!(
          new ApiError({
            message: 'x',
            status: 400,
            code: 'USER_ALIAS_REQUIRED',
          })
        )
      )
      expect(
        await screen.findByText(en.posts.aliasRequired.title)
      ).toBeInTheDocument()
      expect(screen.queryByText(c.images.uploadError)).not.toBeInTheDocument()
    })

    it('says storage is off on a saved post’s attachment and offers no retry', async () => {
      const user = userEvent.setup()
      renderComposer(ownerPost({ id: 12 }))
      mocks.uploadAttachment.mockRejectedValueOnce(
        new ApiError({
          message: 'object storage is not configured on this server',
          status: 503,
          code: 'INTEGRATION_NOT_CONFIGURED',
        })
      )
      await user.upload(screen.getByTestId('post-attachment-input'), png())
      expect(mocks.uploadAttachment).toHaveBeenCalledWith({
        postId: 12,
        file: expect.any(File),
      })
      expect(
        await screen.findByText(c.attachments.unavailable)
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Remove a.png' })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Retry uploading a.png' })
      ).not.toBeInTheDocument()
    })

    it('retries a saved post’s attachment after a storage failure', async () => {
      const user = userEvent.setup()
      renderComposer(ownerPost({ id: 12 }))
      mocks.uploadAttachment
        .mockRejectedValueOnce(
          new ApiError({ message: 'S3 upload failed: x', status: 500 })
        )
        .mockResolvedValueOnce({ id: 3, url: 'http://localhost:9000/b/k.pdf' })
      await user.upload(screen.getByTestId('post-attachment-input'), png())
      expect(
        await screen.findByText(c.uploadErrors.storage)
      ).toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: 'Retry uploading a.png' })
      )
      expect(mocks.uploadAttachment).toHaveBeenCalledTimes(2)
      // Sent: the refetched server list shows it, so the queue drops it.
      await vi.waitFor(() =>
        expect(screen.queryByText('a.png')).not.toBeInTheDocument()
      )
    })

    it('queues an attachment on a new post and sends it after the first draft save', async () => {
      const user = userEvent.setup()
      renderComposer()
      await user.type(title(), 'Draft')
      await user.upload(screen.getByTestId('post-attachment-input'), png())
      expect(screen.getByText('a.png')).toBeInTheDocument()
      expect(screen.getByText(c.attachments.status.queued)).toBeInTheDocument()
      expect(screen.getByText(c.attachments.queuedNote)).toBeInTheDocument()
      expect(mocks.uploadAttachment).not.toHaveBeenCalled()

      let finish: (value: unknown) => void = () => {}
      mocks.uploadAttachment.mockReturnValueOnce(
        new Promise((resolve) => (finish = resolve))
      )
      await user.click(screen.getByRole('button', { name: c.saveDraft }))
      act(() =>
        (lastSave()[1]?.onSuccess as (post: OwnerPost) => void)(
          ownerPost({ id: 77, publishedAt: null })
        )
      )
      act(() => (lastSave()[1]?.onSettled as () => void)())
      expect(mocks.toastSuccess).toHaveBeenCalledWith(c.draftToast)
      expect(mocks.uploadAttachment).toHaveBeenCalledWith({
        postId: 77,
        file: expect.any(File),
      })
      expect(
        await screen.findByText(c.attachments.status.uploading)
      ).toBeInTheDocument()
      // Waits for the file; a second save would create a second post.
      expect(mocks.replace).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: c.saveDraft })).toBeDisabled()
      await act(async () => finish({ id: 1, url: null }))
      expect(mocks.replace).toHaveBeenCalledWith('/posts/77/edit')
    })

    it('keeps a failed attachment after publishing, says so, and moves on once retried', async () => {
      const user = userEvent.setup()
      renderComposer()
      await user.type(title(), 'Post')
      await user.upload(screen.getByTestId('post-attachment-input'), png())
      mocks.uploadAttachment
        .mockRejectedValueOnce(
          new ApiError({ message: 'S3 upload failed: x', status: 500 })
        )
        .mockResolvedValueOnce({ id: 1, url: null })
      await user.click(screen.getByRole('button', { name: c.publish }))
      act(() =>
        (lastSave()[1]?.onSuccess as (post: OwnerPost) => void)(
          ownerPost({ id: 78 })
        )
      )
      act(() => (lastSave()[1]?.onSettled as () => void)())
      expect(mocks.toastSuccess).toHaveBeenCalledWith(c.publishedToast)
      expect(
        await screen.findByText(
          'The post was published, but 1 attachment did not upload. Retry or remove it, or continue without it and add attachments later from the editor.'
        )
      ).toBeInTheDocument()
      expect(screen.getByText(c.uploadErrors.storage)).toBeInTheDocument()
      expect(mocks.push).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: c.publish })).toBeDisabled()
      // Moving on reloads the saved post, so the form waits read-only.
      expect(title()).toBeDisabled()
      expect(body()).toBeDisabled()
      await user.click(
        screen.getByRole('button', { name: 'Retry uploading a.png' })
      )
      expect(mocks.uploadAttachment).toHaveBeenLastCalledWith({
        postId: 78,
        file: expect.any(File),
      })
      await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/posts'))
      expect(mocks.save).toHaveBeenCalledTimes(1)
    })

    it('tells the owner once when the session ends mid-queue, and sends no more', async () => {
      const user = userEvent.setup()
      renderComposer()
      await user.type(title(), 'Draft')
      await user.upload(screen.getByTestId('post-attachment-input'), [
        png(),
        new File(['y'], 'b.pdf', { type: 'application/pdf' }),
      ])
      mocks.uploadAttachment.mockRejectedValueOnce(
        new ApiError({ message: 'Unauthorized', status: 401 })
      )
      await user.click(screen.getByRole('button', { name: c.saveDraft }))
      act(() =>
        (lastSave()[1]?.onSuccess as (post: OwnerPost) => void)(
          ownerPost({ id: 81, publishedAt: null })
        )
      )
      expect(
        await screen.findAllByText(c.uploadErrors.sessionExpired)
      ).toHaveLength(2)
      expect(mocks.uploadAttachment).toHaveBeenCalledTimes(1)
      expect(mocks.toastError).toHaveBeenCalledTimes(1)
      expect(
        screen.getByRole('button', {
          name: 'Continue without them',
        })
      ).toBeInTheDocument()
    })

    it('lets the owner continue without a failed attachment', async () => {
      const user = userEvent.setup()
      renderComposer()
      await user.type(title(), 'Draft')
      await user.upload(screen.getByTestId('post-attachment-input'), png())
      mocks.uploadAttachment.mockRejectedValueOnce(
        new ApiError({
          message: 'x',
          status: 503,
          code: 'INTEGRATION_NOT_CONFIGURED',
        })
      )
      await user.click(screen.getByRole('button', { name: c.saveDraft }))
      act(() =>
        (lastSave()[1]?.onSuccess as (post: OwnerPost) => void)(
          ownerPost({ id: 79, publishedAt: null })
        )
      )
      expect(
        await screen.findByText(c.attachments.unavailable)
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Retry uploading a.png' })
      ).not.toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: 'Continue without it' })
      )
      expect(mocks.replace).toHaveBeenCalledWith('/posts/79/edit')
    })

    it('words the partial save in Persian', async () => {
      const user = userEvent.setup()
      renderComposer(null, 'fa')
      const f = fa.posts.composer
      await user.type(
        screen.getByRole('textbox', { name: f.titleLabel }),
        'پست'
      )
      await user.upload(screen.getByTestId('post-attachment-input'), png())
      mocks.uploadAttachment.mockRejectedValueOnce(
        new ApiError({ message: 'x', status: 403, code: 'INVALID_REQUEST' })
      )
      await user.click(screen.getByRole('button', { name: f.saveDraft }))
      act(() =>
        (lastSave()[1]?.onSuccess as (post: OwnerPost) => void)(
          ownerPost({ id: 80, publishedAt: null })
        )
      )
      expect(
        await screen.findByText(f.uploadErrors.requestRefused)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/پیش‌نویس ذخیره شد، اما ۱ پیوست آپلود نشد/)
      ).toBeInTheDocument()
    })
  })

  it('lets every free-text field inherit the page direction in fa (FE-I18N-02)', async () => {
    const t = fa.posts.composer
    const user = userEvent.setup()
    const { container } = renderComposer(null, 'fa')
    expect(
      screen.getByRole('textbox', { name: t.titleLabel })
    ).not.toHaveAttribute('dir')
    await user.click(screen.getByRole('button', { name: t.collections.new }))
    expect(
      screen.getByRole('textbox', { name: t.collections.newLabel })
    ).not.toHaveAttribute('dir')
    await user.click(screen.getByRole('button', { name: t.mediaChoice.poll }))
    expect(
      screen.getByRole('textbox', {
        name: t.poll.optionLabel.replace('{index, number}', '۱'),
      })
    ).not.toHaveAttribute('dir')
    expect(
      container.querySelectorAll('input[dir="auto"], textarea[dir="auto"]')
    ).toHaveLength(0)
  })

  describe('video, audio and poll blocks (FE-POST-02)', () => {
    type MediaVariables = {
      file: File
      kind: string
      onProgress: (progress: unknown) => void
      isCancelled: () => boolean
    }
    const lastMedia = () =>
      mocks.uploadMedia.mock.calls.at(-1) as unknown as [
        MediaVariables,
        Record<string, (value?: unknown) => void>,
      ]
    const choose = (name: string) =>
      userEvent.setup().click(screen.getByRole('button', { name }))

    it.each(['fa', 'en'] as const)(
      'offers one media block at a time in %s with no message error',
      async (locale) => {
        const t = messages[locale].posts.composer
        const user = userEvent.setup()
        renderComposer(null, locale)
        for (const kind of ['image', 'video', 'audio', 'poll'] as const) {
          expect(
            screen.getByRole('button', { name: t.mediaChoice[kind] })
          ).toBeInTheDocument()
        }
        await user.click(
          screen.getByRole('button', { name: t.mediaChoice.video })
        )
        expect(screen.getByText(t.media.video.hint)).toBeInTheDocument()
        expect(screen.getByText(t.media.playbackNote)).toBeInTheDocument()
        expect(
          screen.queryByRole('button', { name: t.mediaChoice.poll })
        ).not.toBeInTheDocument()
        await user.click(
          screen.getByRole('button', { name: t.mediaChoice.remove.video })
        )
        await user.click(
          screen.getByRole('button', { name: t.mediaChoice.poll })
        )
        expect(screen.getByText(t.poll.lockedNote)).toBeInTheDocument()
        expect(
          within(
            screen.getByRole('region', { name: t.poll.title })
          ).getAllByRole('textbox')
        ).toHaveLength(2)
      }
    )

    it('uploads a video, shows progress and the uploaded file, and saves its id', async () => {
      const user = userEvent.setup({ applyAccept: false })
      renderComposer()
      await user.type(title(), 'Clip')
      await choose(c.mediaChoice.video)
      const input = screen.getByTestId('post-video-input')
      await user.upload(input, new File(['x'], 'a.mp3', { type: 'audio/mpeg' }))
      expect(screen.getByRole('alert')).toHaveTextContent(
        c.media.video.typeError
      )
      expect(mocks.uploadMedia).not.toHaveBeenCalled()
      mocks.mediaPending = true
      await user.upload(
        input,
        new File(['x'], 'clip.mp4', { type: 'video/mp4' })
      )
      const [variables, options] = lastMedia()
      expect(variables).toMatchObject({ kind: 'video' })
      expect(variables.file.name).toBe('clip.mp4')
      act(() =>
        variables.onProgress({ phase: 'uploading', sent: 50, total: 100 })
      )
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        '50'
      )
      mocks.mediaPending = false
      act(() => {
        options.onSuccess({ id: 70, name: 'clip.mp4' })
        options.onSettled()
      })
      expect(await screen.findByText('clip.mp4')).toBeInTheDocument()
      expect(screen.getByText(c.media.pendingNote)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: c.publish }))
      expect(lastSave()[0]).toMatchObject({
        kind: 'video',
        payload: { title: 'Clip', videoId: 70 },
      })
    })

    it('cancels an upload between chunks and says so', async () => {
      const user = userEvent.setup()
      renderComposer()
      await choose(c.mediaChoice.audio)
      mocks.mediaPending = true
      await user.upload(
        screen.getByTestId('post-audio-input'),
        new File(['x'], 'ep.mp3', { type: 'audio/mpeg' })
      )
      const [variables, options] = lastMedia()
      expect(variables.isCancelled()).toBe(false)
      await user.click(screen.getByRole('button', { name: c.media.cancel }))
      expect(variables.isCancelled()).toBe(true)
      expect(
        screen.getByRole('button', { name: c.media.cancel })
      ).toBeDisabled()
      expect(screen.getByRole('status')).toHaveTextContent(c.media.cancelling)
      mocks.mediaPending = false
      const { MediaUploadCancelledError } =
        await import('@/features/posts/lib/media-upload')
      act(() => {
        options.onError(new MediaUploadCancelledError())
        options.onSettled()
      })
      expect(await screen.findByRole('alert')).toHaveTextContent(
        c.media.cancelled
      )
    })

    it('explains an upload the server cannot take', async () => {
      const user = userEvent.setup()
      renderComposer()
      await choose(c.mediaChoice.video)
      // The envelopes `upload/init`, `chunk` and `finalize-*` answer with.
      for (const [status, code, message] of [
        [503, 'INTEGRATION_NOT_CONFIGURED', c.media.unavailable],
        [413, 'UPLOAD_TOO_LARGE', c.media.video.sizeError],
        [413, 'PAYLOAD_TOO_LARGE', c.media.video.sizeError],
        [415, 'UPLOAD_TYPE_NOT_ALLOWED', c.media.video.typeError],
        [404, 'CONTENT_UPLOAD_NOT_FOUND', c.media.uploadError],
        [500, undefined, c.uploadErrors.storage],
        // Another 503 is not "not configured".
        [503, undefined, c.media.uploadError],
        [403, 'INVALID_REQUEST', c.uploadErrors.requestRefused],
      ] as const) {
        await user.upload(
          screen.getByTestId('post-video-input'),
          new File(['x'], 'clip.mp4', { type: 'video/mp4' })
        )
        act(() =>
          lastMedia()[1].onError(new ApiError({ message: 'x', status, code }))
        )
        expect(await screen.findByRole('alert')).toHaveTextContent(message)
      }
    })

    it('needs the file before publishing a video post, not before a draft', async () => {
      const user = userEvent.setup()
      renderComposer()
      await user.type(title(), 'Clip')
      await choose(c.mediaChoice.video)
      await user.click(screen.getByRole('button', { name: c.publish }))
      expect(screen.getByRole('alert')).toHaveTextContent(
        c.media.video.required
      )
      expect(mocks.save).not.toHaveBeenCalled()
      await user.click(screen.getByRole('button', { name: c.saveDraft }))
      expect(lastSave()[0]).toMatchObject({ kind: 'video' })
      expect(lastSave()[0]).not.toHaveProperty('payload.videoId')
    })

    it('writes a poll with its options and choice mode, and needs two options to publish', async () => {
      const user = userEvent.setup()
      renderComposer()
      await user.type(title(), 'Vote')
      await choose(c.mediaChoice.poll)
      const option = (index: number) =>
        screen.getByRole('textbox', {
          name: c.poll.optionLabel.replace('{index, number}', String(index)),
        })
      await user.type(option(1), 'Tea')
      await user.click(screen.getByRole('button', { name: c.publish }))
      expect(screen.getByRole('alert')).toHaveTextContent(
        c.poll.required.replace('{count, number}', '2')
      )
      expect(mocks.save).not.toHaveBeenCalled()
      await user.type(option(2), 'Coffee')
      await user.click(screen.getByRole('button', { name: c.poll.addOption }))
      await user.type(option(3), 'Water')
      await user.click(
        screen.getByRole('button', {
          name: c.poll.removeOption.replace('{index, number}', '3'),
        })
      )
      await user.click(screen.getByRole('switch', { name: c.poll.multiSelect }))
      await user.click(screen.getByRole('button', { name: c.publish }))
      expect(lastSave()[0]).toMatchObject({
        kind: 'poll',
        payload: {
          options: [{ option: 'Tea' }, { option: 'Coffee' }],
          typeSelect: true,
        },
      })
    })

    it('shows a saved video without replacing it, and offers no other block', () => {
      renderComposer(
        ownerPost({ type: 'video', videos: [{ id: 70, name: 'clip.mp4' }] })
      )
      expect(screen.getByText('clip.mp4')).toBeInTheDocument()
      expect(screen.getByText(c.media.savedNote)).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: c.media.video.add })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: c.mediaChoice.remove.video })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: c.mediaChoice.image })
      ).not.toBeInTheDocument()
    })

    it('opens a saved poll with its options, and a saved text post without the poll choice', () => {
      const { unmount } = renderComposer(
        ownerPost({
          type: 'poll',
          poll: {
            multiSelect: true,
            closesAt: null,
            options: [
              { id: 1, label: 'Tea' },
              { id: 2, label: 'Coffee' },
            ],
          },
        })
      )
      expect(screen.getByDisplayValue('Coffee')).toBeInTheDocument()
      expect(
        screen.getByRole('switch', { name: c.poll.multiSelect })
      ).toBeChecked()
      unmount()
      renderComposer(ownerPost())
      expect(
        screen.getByRole('button', { name: c.mediaChoice.video })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: c.mediaChoice.poll })
      ).not.toBeInTheDocument()
    })

    it('says why a poll with votes cannot be saved', async () => {
      const user = userEvent.setup()
      renderComposer(
        ownerPost({
          type: 'poll',
          poll: {
            multiSelect: false,
            closesAt: null,
            options: [
              { id: 1, label: 'Tea' },
              { id: 2, label: 'Coffee' },
            ],
          },
        })
      )
      await user.click(screen.getByRole('button', { name: c.saveChanges }))
      expect(lastSave()[0]).toMatchObject({ postId: 12, kind: 'poll' })
      act(() =>
        (lastSave()[1]?.onError as (error: ApiError) => void)(
          new ApiError({
            message: 'x',
            status: 400,
            code: 'CONTENT_POLL_LOCKED',
          })
        )
      )
      expect(await screen.findByRole('alert')).toHaveTextContent(
        en.posts.errors.pollLocked
      )
    })

    it('keeps a file a draft save attached, even when the post has not refetched yet', async () => {
      const user = userEvent.setup()
      renderComposer(ownerPost({ publishedAt: null }))
      await choose(c.mediaChoice.video)
      await user.upload(
        screen.getByTestId('post-video-input'),
        new File(['x'], 'clip.mp4', { type: 'video/mp4' })
      )
      act(() => lastMedia()[1].onSuccess({ id: 70, name: 'clip.mp4' }))
      expect(
        screen.getByRole('button', { name: c.mediaChoice.remove.video })
      ).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: c.saveDraft }))
      expect(lastSave()[0]).toMatchObject({ kind: 'video' })
      // The save answered before its refetch: `saved` still says text.
      act(() =>
        (lastSave()[1]?.onSuccess as (post: OwnerPost) => void)(
          ownerPost({
            type: 'video',
            publishedAt: null,
            videos: [{ id: 70, name: 'clip.mp4' }],
          })
        )
      )
      expect(await screen.findByText(c.media.savedNote)).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: c.mediaChoice.remove.video })
      ).not.toBeInTheDocument()
    })

    it('opens a draft poll saved with fewer than two options on two inputs', () => {
      renderComposer(
        ownerPost({
          type: 'poll',
          poll: { multiSelect: false, closesAt: null, options: [] },
        })
      )
      expect(
        within(screen.getByRole('region', { name: c.poll.title })).getAllByRole(
          'textbox'
        )
      ).toHaveLength(2)
    })
  })
})
