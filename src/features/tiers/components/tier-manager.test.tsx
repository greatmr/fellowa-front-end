import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../../../messages/en.json'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/features/tiers/api/tier-hooks', () => ({
  useTiersQuery: () => ({
    isPending: false,
    isError: false,
    data: [
      {
        id: 7,
        title: 'Supporter',
        description: 'Monthly support',
        priceToman: 50000,
        benefits: [{ id: 2, title: 'Special posts', roleId: 1 }],
      },
    ],
  }),
  useTierRolesQuery: () => ({
    isPending: false,
    isError: false,
    data: [{ id: 1, title: 'Post', persianTitle: 'پست' }],
  }),
  useCreateTierMutation: () => ({
    isPending: false,
    isError: false,
    mutate: mocks.create,
    reset: vi.fn(),
  }),
  useUpdateTierMutation: () => ({
    isPending: false,
    isError: false,
    mutate: mocks.update,
    reset: vi.fn(),
  }),
  useDeleteTierMutation: () => ({
    isPending: false,
    isError: false,
    mutate: mocks.remove,
    reset: vi.fn(),
  }),
}))

const { TierManager } = await import('./tier-manager')

function renderManager() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TierManager viewerId={4} />
    </NextIntlClientProvider>
  )
}

describe('TierManager', () => {
  beforeEach(() => {
    mocks.create.mockClear()
    mocks.update.mockClear()
    mocks.remove.mockClear()
  })

  it('preloads a tier and submits a whole-number Toman price and backend benefit role', async () => {
    const user = userEvent.setup()
    renderManager()
    expect(screen.getByText('50,000 Toman')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const form = screen.getByRole('dialog', { name: 'Edit membership tier' })
    expect(within(form).getByLabelText('Tier name')).toHaveValue('Supporter')
    expect(within(form).getByLabelText(/^Monthly price \(Toman\)/)).toHaveValue(
      50000
    )
    await user.clear(within(form).getByLabelText(/^Monthly price \(Toman\)/))
    await user.type(
      within(form).getByLabelText(/^Monthly price \(Toman\)/),
      '75000'
    )
    await user.click(within(form).getByRole('button', { name: 'Save' }))
    expect(mocks.update).toHaveBeenCalledWith(
      {
        id: 7,
        title: 'Supporter',
        description: 'Monthly support',
        price: 75000,
        benefits: [{ title: 'Special posts', roleId: 1 }],
      },
      expect.any(Object)
    )
  })

  it('requires confirmation before deleting a tier', async () => {
    const user = userEvent.setup()
    renderManager()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(mocks.remove).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Delete tier?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(mocks.remove).toHaveBeenCalledWith(7, expect.any(Object))
  })
})
