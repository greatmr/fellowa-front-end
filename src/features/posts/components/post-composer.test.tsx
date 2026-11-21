import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as I18nNavigation from '@/i18n/navigation'
import type { StudioPost } from '@/features/posts/types/post'
import { ApiError } from '@/lib/api/errors'

import { renderWithIntl } from '../../../../test/render'
import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'
import { studioPost } from '../test/fixtures'

type Mutate = (variables: unknown, options?: Record<string, unknown>) => void

const mocks = vi.hoisted(() => ({
  save: vi.fn<Mutate>(),
  upload: vi.fn<Mutate>(),
  removeImage: vi.fn<Mutate>(),
  push: vi.fn(),
  replace: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  tiers: {} as Record<string, unknown>,
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
  useUploadPostAttachmentMutation: () => mutation(vi.fn()),
  useDeletePostAttachmentMutation: () => mutation(vi.fn()),
}))
vi.mock('@/features/tiers/client', () => ({ useTiersQuery: () => mocks.tiers }))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nNavigation>()),
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}))
vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}))

const { PostComposer } = await import('./post-composer')

const messages = { fa, en } as const
const c = en.posts.composer

const tier = (id: number, title: string) => ({ id, title })

function renderComposer(
  saved: StudioPost | null = null,
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
  screen.getByRole<HTMLTextAreaElement>('textbox', { name: c.bodyLabel })

describe('PostComposer', () => {
  beforeEach(() => {
    for (const fn of [
      mocks.save,
      mocks.upload,
      mocks.removeImage,
      mocks.push,
      mocks.replace,
      mocks.toastSuccess,
      mocks.toastError,
    ]) {
      fn.mockReset()
    }
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
      await user.click(screen.getByRole('button', { name: t.insertDivider }))
      await user.click(
        screen.getByRole('radio', { name: new RegExp(t.access.tiers) })
      )
      expect(screen.getByText(t.access.laterTiersNote)).toBeInTheDocument()
      expect(screen.getByText(t.attachments.saveFirst)).toBeInTheDocument()
      unmount()
      renderComposer(
        studioPost({ isPublic: false, paywallPosition: 3 }),
        locale
      )
      expect(screen.getByText(t.access.keepTitle)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: t.saveChanges })
      ).toBeInTheDocument()
    }
  )

  it('renders no single-post purchase, collections or formatting controls (FQ-31, FQ-30)', () => {
    renderComposer()
    for (const text of [/purchase/i, /collection/i, /schedule/i]) {
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    }
    for (const name of [/bold/i, /italic/i, /link/i, /poll/i, /video/i]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
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
    await user.type(body(), 'Plain body')
    await user.click(screen.getByRole('button', { name: c.publish }))
    const [input, options] = lastSave()
    expect(input).toEqual({
      kind: 'text',
      payload: {
        title: 'Hello',
        text: 'Plain body',
        paywallPosition: null,
        tireIds: [],
        visibility: { type: true },
      },
    })
    ;(options?.onSuccess as (post: StudioPost) => void)(studioPost())
    expect(mocks.toastSuccess).toHaveBeenCalledWith(c.publishedToast)
    expect(mocks.push).toHaveBeenCalledWith('/studio/posts')
  })

  it('inserts the divider at the caret and sends its offset in code points', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(title(), 'T')
    fireEvent.change(body(), { target: { value: 'سلام 😀 بقیه' } })
    // Caret after "سلام 😀 " = 4 + 1 + 2 (surrogate pair) + 1 = 8 UTF-16 units.
    body().setSelectionRange(8, 8)
    await user.click(screen.getByRole('button', { name: c.insertDivider }))
    expect(
      screen.getByRole('separator', { name: c.dividerLabel })
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: c.afterLabel })).toHaveValue(
      'بقیه'
    )
    await user.click(screen.getByRole('button', { name: c.saveDraft }))
    expect(lastSave()[0]).toMatchObject({
      payload: {
        text: 'سلام 😀 بقیه',
        paywallPosition: 7,
        visibility: { type: true, isDraft: true },
      },
    })
    await user.click(screen.getByRole('button', { name: c.removeDivider }))
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
    expect(body()).toHaveValue('سلام 😀 بقیه')
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

  it('goes to the edit page after the first draft save', async () => {
    const user = userEvent.setup()
    renderComposer()
    await user.type(title(), 'Draft')
    await user.click(screen.getByRole('button', { name: c.saveDraft }))
    ;(lastSave()[1]?.onSuccess as (post: StudioPost) => void)(
      studioPost({ id: 77, publishedAt: null })
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith(c.draftToast)
    expect(mocks.replace).toHaveBeenCalledWith('/studio/posts/77/edit')
  })

  it('edits a limited post: keeps its tiers and date, resends the paywall', async () => {
    const user = userEvent.setup()
    renderComposer(
      studioPost({ text: 'ab😀cd', paywallPosition: 3, isPublic: false })
    )
    expect(body()).toHaveValue('ab😀')
    expect(screen.getByRole('textbox', { name: c.afterLabel })).toHaveValue(
      'cd'
    )
    await user.type(screen.getByRole('textbox', { name: c.afterLabel }), 'e')
    await user.click(screen.getByRole('button', { name: c.saveChanges }))
    const [input, options] = lastSave()
    ;(options?.onSettled as () => void)()
    expect(input).toEqual({
      postId: 12,
      kind: 'text',
      payload: {
        title: 'سلام دنیا',
        text: 'ab😀cde',
        paywallPosition: 3,
        visibility: { type: false, datePublished: '2026-11-20T08:00:00.000Z' },
      },
    })
    await user.click(screen.getByRole('button', { name: c.access.choose }))
    await user.click(screen.getByRole('checkbox', { name: 'Gold' }))
    await user.click(screen.getByRole('button', { name: c.saveChanges }))
    expect(lastSave()[0]).toMatchObject({ payload: { tireIds: [5] } })
    expect(screen.getByText(c.moveToDraftHint)).toBeInTheDocument()
  })

  it('uploads a picked image, refuses another type, and saves an image post', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderComposer()
    await user.type(title(), 'Gallery')
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
      studioPost({
        type: 'image',
        images: [{ id: 9, url: 'https://cdn.example/s.png' }],
      })
    )
    const gallery = screen.getByRole('list')
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
})
