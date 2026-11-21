import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Tier } from '@/features/tiers/types/tier'
import { ApiError } from '@/lib/api/errors'

import { renderWithIntl } from '../../../../test/render'
import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'

const saved: Tier = {
  id: 7,
  title: 'Supporter',
  description: 'Monthly support',
  priceToman: 150000,
  chatEnabled: false,
  capacity: null,
  cover: null,
  benefits: [
    { id: 2, title: 'Special posts', roleId: 1 },
    { id: 3, title: 'My own thanks', roleId: null },
  ],
  seatsTaken: 4,
}

const mocks = vi.hoisted(() => ({
  tiers: [] as unknown[],
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  upload: vi.fn(),
}))

function mutation(mutate: (...args: unknown[]) => void) {
  return {
    isPending: false,
    isError: false,
    error: null,
    mutate,
    reset: vi.fn(),
  }
}

vi.mock('@/features/tiers/api/tier-hooks', () => ({
  useTiersQuery: () => ({
    isPending: false,
    isError: false,
    data: mocks.tiers,
  }),
  useTierRolesQuery: () => ({
    isPending: false,
    isError: false,
    data: [
      { id: 1, title: 'Post', persianTitle: 'پست' },
      { id: 2, title: 'Live stream', persianTitle: 'پخش زنده' },
      { id: 3, title: 'Shout-out', persianTitle: 'قدردانی' },
      { id: 4, title: 'Merch', persianTitle: 'هدیه' },
    ],
    refetch: vi.fn(),
  }),
  useCreateTierMutation: () => mutation(mocks.create),
  useUpdateTierMutation: () => mutation(mocks.update),
  useDeleteTierMutation: () => mutation(mocks.remove),
  useUploadTierCoverMutation: () => mutation(mocks.upload),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { TierManager } = await import('./tier-manager')
const { toast } = await import('sonner')

const messages = { fa, en } as const

function renderManager(locale: keyof typeof messages = 'en') {
  renderWithIntl(<TierManager viewerId={4} />, { locale, strict: true })
}

/** `<Money>` puts the unit in its own element; match the whole run. */
const money = (text: string) => (_: string, element: Element | null) =>
  element?.textContent === text &&
  [...element.children].every((child) => child.textContent !== text)

const preview = () =>
  screen.getByRole('complementary', { name: 'Tier card preview' })

describe('TierManager', () => {
  beforeEach(() => {
    mocks.tiers = [saved]
    for (const fn of [mocks.create, mocks.update, mocks.remove, mocks.upload]) {
      fn.mockReset()
    }
  })

  it.each(['fa', 'en'] as const)(
    'renders the list, guide, builder, picker and delete dialog in %s with no message error',
    async (locale) => {
      const m = messages[locale].tiers
      const user = userEvent.setup()
      renderManager(locale)
      // The guide button once rendered `t('guide')`, an object (INSUFFICIENT_PATH).
      await user.click(screen.getByRole('button', { name: m.openGuide }))
      const guide = screen.getByRole('dialog')
      await user.click(
        within(guide).getByRole('button', { name: m.guide.next })
      )
      await user.click(
        within(guide).getByRole('button', { name: m.guide.finish })
      )
      await user.click(
        screen.getByRole('button', { name: m.builder.addBenefit })
      )
      await user.click(
        screen.getByRole('button', { name: m.picker.customTitle })
      )
      await user.click(screen.getByRole('button', { name: m.picker.back }))
      await user.keyboard('{Escape}')
      await user.click(
        screen.getAllByRole('button', { name: m.builder.back })[0]!
      )
      await user.click(screen.getByRole('button', { name: m.edit }))
      await user.click(
        screen.getByRole('button', { name: m.builder.deleteTier })
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }
  )

  it('edits a tier in the builder and saves whole-number Toman without touching the cover', async () => {
    const user = userEvent.setup()
    renderManager()
    expect(screen.getByText(money('150,000 Toman'))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(
      screen.getByRole('heading', { name: 'Edit tier: “Supporter”' })
    ).toBeInTheDocument()
    const price = screen.getByLabelText(/^Monthly price/)
    await user.clear(price)
    await user.type(price, '200000')
    await user.click(
      screen.getAllByRole('button', { name: 'Save changes' })[0]!
    )
    expect(mocks.update).toHaveBeenCalledWith(
      {
        id: 7,
        title: 'Supporter',
        description: 'Monthly support',
        price: 200000,
        chatEnabled: false,
        tireAdvanced: { limitedUser: false },
        benefits: [
          { title: 'Special posts', roleId: 1 },
          { title: 'My own thanks' },
        ],
      },
      expect.any(Object)
    )
  })

  it('draws the live preview from unsaved state, with price chips, capacity and chat', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getByRole('button', { name: 'Create new tier' }))
    expect(within(preview()).getByText('Tier name')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^Tier name/), 'Gold')
    await user.click(screen.getByRole('button', { name: '350,000 Toman' }))
    expect(screen.getByLabelText(/^Monthly price/)).toHaveValue('350000')
    await user.click(screen.getByRole('switch', { name: /Limit the number/ }))
    await user.type(screen.getByLabelText(/Maximum number of members/), '30')
    await user.click(screen.getByRole('switch', { name: 'Chat with me' }))
    const card = within(preview())
    expect(card.getByRole('heading', { name: 'Gold' })).toBeInTheDocument()
    expect(card.getByText(money('350,000 Toman'))).toBeInTheDocument()
    expect(card.getByText('Capacity: 30 members')).toBeInTheDocument()
    expect(card.getByText('Chat with the creator')).toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('warns below 100,000 Toman and does not save', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getByRole('button', { name: 'Create new tier' }))
    await user.type(screen.getByLabelText(/^Tier name/), 'Gold')
    await user.type(screen.getByLabelText(/^Monthly price/), '50000')
    expect(
      screen.getByText('The lowest monthly price is 100,000 Toman.')
    ).toBeInTheDocument()
    await user.click(
      screen.getAllByRole('button', { name: 'Publish tier' })[0]!
    )
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('adds a benefit from the live catalog, then its edited title', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getByRole('button', { name: 'Create new tier' }))
    await user.click(screen.getByRole('button', { name: 'Add benefit' }))
    const catalog = screen.getByRole('dialog', { name: 'Add a new benefit' })
    await user.click(
      within(catalog).getByRole('button', { name: 'Add “Live stream”' })
    )
    const step = screen.getByRole('dialog', { name: 'Add “Live stream”' })
    const title = within(step).getByLabelText('Benefit title')
    expect(title).toHaveValue('Live stream')
    await user.clear(title)
    await user.type(title, 'Monthly live Q&A')
    await user.click(within(step).getByRole('button', { name: 'Add benefit' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(preview()).getByText('Monthly live Q&A')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^Tier name/), 'Gold')
    await user.type(screen.getByLabelText(/^Monthly price/), '150000')
    await user.click(
      screen.getAllByRole('button', { name: 'Publish tier' })[0]!
    )
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        benefits: [{ title: 'Monthly live Q&A', roleId: 2 }],
      }),
      expect.any(Object)
    )
  })

  it('deletes through a dialog that states what happens to members (Q-22)', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Delete this tier' }))
    expect(mocks.remove).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Delete “Supporter”?' })
    expect(
      within(dialog).getByText(/Current members keep access until the period/)
    ).toBeInTheDocument()
    await user.click(
      within(dialog).getByRole('button', { name: 'Delete tier' })
    )
    expect(mocks.remove).toHaveBeenCalledWith(7, expect.any(Object))
  })

  it('shows the address step when the caller has no page yet', async () => {
    mocks.create.mockImplementation((_payload, options) =>
      (options as { onError: (error: ApiError) => void }).onError(
        new ApiError({
          message: 'Set an alias before setting up your page',
          status: 400,
          code: 'USER_ALIAS_REQUIRED',
        })
      )
    )
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getByRole('button', { name: 'Create new tier' }))
    await user.type(screen.getByLabelText(/^Tier name/), 'Gold')
    await user.type(screen.getByLabelText(/^Monthly price/), '150000')
    await user.click(
      screen.getAllByRole('button', { name: 'Publish tier' })[0]!
    )
    expect(
      screen.getByText('Choose your page address first')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Choose an address' })
    ).toHaveAttribute('href', expect.stringContaining('/auth/url'))
  })

  it('shows the empty state and lets the guide prefill the builder', async () => {
    mocks.tiers = []
    const user = userEvent.setup()
    renderManager()
    expect(
      screen.getByRole('heading', { name: 'Set up your membership tiers' })
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Start the step-by-step guide' })
    )
    const guide = screen.getByRole('dialog')
    await user.click(
      within(guide).getByRole('button', { name: 'Next: pricing' })
    )
    await user.click(
      within(guide).getByRole('button', { name: '200,000 Toman' })
    )
    await user.click(
      within(guide).getByRole('button', {
        name: 'Confirm and open the tier form',
      })
    )
    expect(screen.getByLabelText(/^Monthly price/)).toHaveValue('200000')
    expect(screen.getByLabelText(/^Tier name/)).toHaveValue('Close companion')
    const card = within(preview())
    for (const name of ['Post', 'Live stream', 'Shout-out']) {
      expect(card.getByText(name)).toBeInTheDocument()
    }
    expect(card.queryByText('Merch')).not.toBeInTheDocument()
  })

  describe('design parity, round 3 (FE-TIER-03)', () => {
    it('captions the preview with the public-page size note', async () => {
      const user = userEvent.setup()
      renderManager()
      await user.click(screen.getByRole('button', { name: 'Create new tier' }))
      expect(
        within(preview()).getByText(
          'This card appears at this size on your public page.'
        )
      ).toBeInTheDocument()
    })

    it.each([
      ['fa', 'اعضای قبلی تا زمان تمدید طبق مبلغ قبلی'],
      ['en', 'Existing members stay at the previous price until their renewal'],
    ] as const)(
      'says existing members keep the old price until renewal (O-3) in %s',
      (locale, line) => {
        renderManager(locale)
        expect(screen.getByText(new RegExp(line))).toBeInTheDocument()
      }
    )

    it('ignores adding a benefit whose title is already listed', async () => {
      const user = userEvent.setup()
      renderManager()
      await user.click(screen.getByRole('button', { name: 'Edit' }))
      await user.click(screen.getByRole('button', { name: 'Add benefit' }))
      await user.click(screen.getByRole('button', { name: 'Custom benefit' }))
      await user.type(
        screen.getByLabelText('Benefit title'),
        '  Special posts  '
      )
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', {
          name: 'Add benefit',
        })
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(
        within(preview())
          .getAllByRole('listitem')
          .map((item) => item.textContent)
      ).toEqual(['Special posts', 'My own thanks'])
    })

    it('counts the tier title against 120 and stops typing there', async () => {
      const user = userEvent.setup()
      renderManager()
      await user.click(screen.getByRole('button', { name: 'Create new tier' }))
      const name = screen.getByLabelText(/^Tier name/)
      expect(name).toHaveAccessibleDescription('0 / 120')
      await user.type(name, 'Gold')
      expect(name).toHaveAccessibleDescription('4 / 120')
      await user.type(name, 'x'.repeat(130))
      expect(name).toHaveValue(`Gold${'x'.repeat(116)}`)
      expect(name).toHaveAccessibleDescription('120 / 120')
    })

    it('counts the benefit title against 160 in Persian digits', async () => {
      const user = userEvent.setup()
      renderManager('fa')
      const m = fa.tiers
      await user.click(screen.getByRole('button', { name: m.create }))
      await user.click(
        screen.getByRole('button', { name: m.builder.addBenefit })
      )
      await user.click(
        screen.getByRole('button', { name: m.picker.customTitle })
      )
      const title = screen.getByLabelText(m.picker.titleLabel)
      await user.type(title, 'پست')
      expect(title).toHaveAccessibleDescription('۳ / ۱۶۰')
      await user.type(title, 'x'.repeat(170))
      expect(title).toHaveAccessibleDescription('۱۶۰ / ۱۶۰')
    })
  })

  it('centres the list header, keeps the hint in the title block and sizes both actions alike (FE-TIER-05)', () => {
    renderManager()
    const header = screen.getByTestId('tiers-list-header')
    expect(header).toHaveClass('items-center')
    expect(header).not.toHaveClass('items-end')
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.parentElement).toContainElement(
      screen.getByText(en.tiers.overviewHint)
    )
    const guide = screen.getByRole('button', { name: en.tiers.openGuide })
    const create = screen.getByRole('button', { name: en.tiers.create })
    expect(guide).toHaveClass('h-10')
    expect(create).toHaveClass('h-10')
  })

  it('labels the owner seat count as seats taken, against the capacity when set', () => {
    mocks.tiers = [saved, { ...saved, id: 8, title: 'Gold', capacity: 10 }]
    renderManager()
    expect(screen.getByText('4 seats taken')).toBeInTheDocument()
    expect(screen.getByText('4 / 10 seats taken')).toBeInTheDocument()
    expect(screen.queryByText(/active members/)).not.toBeInTheDocument()
  })

  it('reorders benefits, and the preview and payload follow that order', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]!)
    await user.click(
      screen.getByRole('button', { name: 'Move “My own thanks” up' })
    )
    const items = within(preview()).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'My own thanks',
      'Special posts',
    ])
    await user.click(
      screen.getAllByRole('button', { name: 'Save changes' })[0]!
    )
    const [body] = mocks.update.mock.calls[0]!
    expect(body).toMatchObject({
      benefits: [
        { title: 'My own thanks' },
        { title: 'Special posts', roleId: 1 },
      ],
    })
    // The price was not touched, so it is not sent (BE-TIER-06 checks a sent price).
    expect(body).not.toHaveProperty('price')
  })

  it('adds a custom benefit with no role', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getByRole('button', { name: 'Create new tier' }))
    await user.click(screen.getByRole('button', { name: 'Add benefit' }))
    await user.click(screen.getByRole('button', { name: 'Custom benefit' }))
    const step = screen.getByRole('dialog', { name: 'Custom benefit' })
    const title = within(step).getByLabelText('Benefit title')
    expect(title).toHaveValue('')
    await user.type(title, 'Handwritten postcard')
    await user.click(within(step).getByRole('button', { name: 'Add benefit' }))
    await user.type(screen.getByLabelText(/^Tier name/), 'Gold')
    await user.type(screen.getByLabelText(/^Monthly price/), '150000')
    await user.click(
      screen.getAllByRole('button', { name: 'Publish tier' })[0]!
    )
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        benefits: [{ title: 'Handwritten postcard' }],
      }),
      expect.any(Object)
    )
  })

  it('shows the server minimum (TIER_PRICE_BELOW_MINIMUM) on the price field', async () => {
    mocks.update.mockImplementation((_payload, options) =>
      (options as { onError: (error: ApiError) => void }).onError(
        new ApiError({
          message: 'Tier price must be at least 100000 Toman',
          status: 400,
          code: 'TIER_PRICE_BELOW_MINIMUM',
        })
      )
    )
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]!)
    const price = screen.getByLabelText(/^Monthly price/)
    await user.clear(price)
    await user.type(price, '120000')
    await user.click(
      screen.getAllByRole('button', { name: 'Save changes' })[0]!
    )
    expect(price).toHaveAttribute('aria-invalid', 'true')
    expect(
      screen.getByText('The lowest monthly price is 100,000 Toman.')
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Could not save this tier. Try again.')
    ).toBeNull()
  })

  it('shows a list cover from cover.url, and no image without one (BE-TIER-07)', () => {
    mocks.tiers = [
      saved,
      {
        ...saved,
        id: 8,
        title: 'Gold',
        cover: {
          id: '1712345678-abcdef012345.webp',
          url: 'https://cdn.example/gold.webp',
        },
      },
    ]
    renderManager()
    expect(screen.getByRole('img', { name: 'Cover of Gold' })).toHaveAttribute(
      'src',
      'https://cdn.example/gold.webp'
    )
    expect(
      screen.queryByRole('img', { name: 'Cover of Supporter' })
    ).not.toBeInTheDocument()
  })

  it('previews the saved cover in the builder from the list url', async () => {
    mocks.tiers = [
      {
        ...saved,
        cover: {
          id: '1712345678-abcdef012345.webp',
          url: 'https://cdn.example/gold.webp',
        },
      },
    ]
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('img', { name: 'Cover preview' })).toHaveAttribute(
      'src',
      'https://cdn.example/gold.webp'
    )
  })

  it('refuses a cover over 10 MB with the size stated, without uploading', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderManager()
    await user.click(screen.getByRole('button', { name: 'Create new tier' }))
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!
    const big = new File(['x'], 'big.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 })
    await user.upload(input, big)
    expect(
      screen.getByText('The image is too large. Choose one up to 10 MB.')
    ).toBeInTheDocument()
    expect(mocks.upload).not.toHaveBeenCalled()
    const ok = new File(['x'], 'ok.png', { type: 'image/png' })
    Object.defineProperty(ok, 'size', { value: 5 * 1024 * 1024 })
    await user.upload(input, ok)
    expect(mocks.upload).toHaveBeenCalledWith(ok, expect.any(Object))
  })

  describe('cover upload failures (FE-TIER-04)', () => {
    /** Opens a new tier and uploads a valid file whose upload fails so. */
    async function failUpload(error: ApiError) {
      mocks.upload.mockImplementation((_file, options) =>
        (options as { onError: (error: ApiError) => void }).onError(error)
      )
      const user = userEvent.setup()
      renderManager()
      await user.click(screen.getByRole('button', { name: 'Create new tier' }))
      const input =
        document.querySelector<HTMLInputElement>('input[type="file"]')!
      await user.upload(
        input,
        new File(['x'], 'cover.png', { type: 'image/png' })
      )
      expect(mocks.upload).toHaveBeenCalledTimes(1)
    }

    const alert = () => screen.getByRole('alert')

    beforeEach(() => vi.mocked(toast.error).mockReset())

    it.each([
      [
        '503 INTEGRATION_NOT_CONFIGURED',
        new ApiError({
          message: 'object storage is not configured on this server',
          status: 503,
          code: 'INTEGRATION_NOT_CONFIGURED',
        }),
        'Cover uploads are unavailable right now. You can save this tier without a cover and add one later.',
      ],
      [
        '500',
        new ApiError({
          message: 'S3 upload failed: timeout',
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
        }),
        'The image could not be stored. Try again in a moment.',
      ],
      [
        '403 INVALID_REQUEST (Origin check)',
        new ApiError({
          message: 'API request failed',
          status: 403,
          code: 'INVALID_REQUEST',
        }),
        'This request could not be verified. Open Fellowa at its usual address, reload the page and try again.',
      ],
      [
        '403 without a code (unverified account)',
        new ApiError({ message: 'API request failed', status: 403 }),
        'Your account cannot upload covers yet. Verify your account or sign in again.',
      ],
      [
        '413 UPLOAD_TOO_LARGE',
        new ApiError({
          message: 'File too large',
          status: 413,
          code: 'UPLOAD_TOO_LARGE',
        }),
        'The image is too large. Choose one up to 10 MB.',
      ],
      [
        '415 UPLOAD_TYPE_NOT_ALLOWED',
        new ApiError({
          message: 'File type not allowed',
          status: 415,
          code: 'UPLOAD_TYPE_NOT_ALLOWED',
        }),
        'Choose a JPEG, PNG, WebP or GIF image.',
      ],
      [
        '503 with another code',
        new ApiError({ message: 'Service Unavailable', status: 503 }),
        'Could not upload the image. Try again.',
      ],
      [
        'a network error or timeout',
        new ApiError({ message: 'timeout', isNetworkError: true }),
        'Could not upload the image. Try again.',
      ],
    ])('shows its own line for %s', async (_case, error, line) => {
      await failUpload(error)
      expect(alert()).toHaveTextContent(line)
      expect(toast.error).not.toHaveBeenCalled()
    })

    it('shows the session toast on 401, with no line', async () => {
      await failUpload(
        new ApiError({ message: 'Session expired', status: 401 })
      )
      expect(toast.error).toHaveBeenCalledWith(
        'Your session has ended. Sign in again.'
      )
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('shows the address step on USER_ALIAS_REQUIRED, with no line', async () => {
      await failUpload(
        new ApiError({
          message: 'Set an alias before setting up your page',
          status: 400,
          code: 'USER_ALIAS_REQUIRED',
        })
      )
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Choose your page address first'
      )
    })
  })

  it('shows no image for a cover without a usable url, and saving keeps it (FE-TIER-04)', async () => {
    mocks.tiers = [
      {
        ...saved,
        cover: { id: '1712345678-abcdef012345.webp', url: null },
      },
    ]
    const user = userEvent.setup()
    renderManager()
    expect(screen.queryByRole('img')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    // The placeholder, not an <img> resolved against the page URL.
    const placeholder = screen.getByRole('img', { name: 'Cover preview' })
    expect(placeholder.tagName).toBe('SPAN')
    expect(document.querySelector('img')).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Remove image' })
    ).toBeInTheDocument()
    await user.click(
      screen.getAllByRole('button', { name: 'Save changes' })[0]!
    )
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update.mock.calls[0]![0]).not.toHaveProperty('coverTireId')
  })
})
