import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Tier } from '@/features/tiers/types/tier'
import { ApiError } from '@/lib/api/errors'

import en from '../../../../messages/en.json'

const saved: Tier = {
  id: 7,
  title: 'Supporter',
  description: 'Monthly support',
  priceToman: 150000,
  chatEnabled: false,
  capacity: null,
  coverId: null,
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
  useTierCoverQuery: () => ({ data: undefined }),
  useCreateTierMutation: () => mutation(mocks.create),
  useUpdateTierMutation: () => mutation(mocks.update),
  useDeleteTierMutation: () => mutation(mocks.remove),
  useUploadTierCoverMutation: () => mutation(mocks.upload),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { TierManager } = await import('./tier-manager')

function renderManager() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TierManager viewerId={4} />
    </NextIntlClientProvider>
  )
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
})
