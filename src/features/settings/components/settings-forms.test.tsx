import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '../../../../test/render'

// The server boundary is covered by server/actions.test.ts; the real hooks run.
const mocks = vi.hoisted(() => ({
  updatePersonal: vi.fn(),
  changePassword: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))
vi.mock('@/features/settings/server/actions', () => ({
  updatePersonalAction: mocks.updatePersonal,
  changePasswordAction: mocks.changePassword,
}))
vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}))

const { PersonalForm } = await import('./personal-form')
const { PasswordForm } = await import('./password-form')

function renderForm(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return renderWithIntl(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
    { locale: 'en' }
  )
}

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset()
})

describe('PersonalForm', () => {
  const empty = { firstName: '', lastName: '', phoneNumber: '' }

  it('saves the details for this viewer and confirms', async () => {
    mocks.updatePersonal.mockImplementation(async (_viewer, values) => ({
      ok: true,
      data: values,
    }))
    const user = userEvent.setup()
    renderForm(<PersonalForm viewerId={42} initial={empty} />)

    await user.type(screen.getByLabelText('First name'), 'Sara')
    await user.type(screen.getByLabelText('Mobile number'), '۰۹۱۲۱۲۳۴۵۶۷')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.updatePersonal).toHaveBeenCalledWith(42, {
        firstName: 'Sara',
        lastName: '',
        phoneNumber: '09121234567',
      })
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Your details were saved.')
  })

  it('shows a field error for an invalid mobile number and does not save', async () => {
    const user = userEvent.setup()
    renderForm(<PersonalForm viewerId={42} initial={empty} />)

    await user.type(screen.getByLabelText('Mobile number'), '12345')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText(
        'Enter an 11-digit mobile number that starts with 09.'
      )
    ).toBeVisible()
    expect(mocks.updatePersonal).not.toHaveBeenCalled()
  })

  it('starts from the saved details and only saves after a change', () => {
    renderForm(
      <PersonalForm
        viewerId={42}
        initial={{ firstName: 'Sara', lastName: 'Karimi', phoneNumber: '' }}
      />
    )

    expect(screen.getByLabelText('First name')).toHaveValue('Sara')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('after saving, shows what was stored and is clean again', async () => {
    mocks.updatePersonal.mockImplementation(async (_viewer, values) => ({
      ok: true,
      data: values,
    }))
    const user = userEvent.setup()
    renderForm(<PersonalForm viewerId={42} initial={empty} />)

    await user.type(screen.getByLabelText('Mobile number'), '۰۹۱۲ ۱۲۳ ۴۵۶۷')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Mobile number')).toHaveValue('09121234567')
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('says the save failed, not that the session ended, when it could not be checked', async () => {
    mocks.updatePersonal.mockResolvedValue({
      ok: false,
      code: 'SESSION_CHECK_FAILED',
      isNetworkError: true,
    })
    const user = userEvent.setup()
    renderForm(<PersonalForm viewerId={42} initial={empty} />)

    await user.type(screen.getByLabelText('First name'), 'Sara')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "That didn't save. Try again."
      )
    )
  })
})

describe('PasswordForm', () => {
  async function fill(
    current = 'old-pass',
    next = 'new-password',
    repeat = next
  ) {
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Current password'), current)
    await user.type(screen.getByLabelText('New password'), next)
    await user.type(screen.getByLabelText('Repeat the new password'), repeat)
    await user.click(screen.getByRole('button', { name: 'Change password' }))
  }

  it('sends only the current and new password, then clears the form', async () => {
    mocks.changePassword.mockResolvedValue({ ok: true, data: null })
    renderForm(<PasswordForm viewerId={42} email="me@example.com" />)

    await fill()

    await waitFor(() =>
      expect(mocks.changePassword).toHaveBeenCalledWith(42, {
        currentPassword: 'old-pass',
        newPassword: 'new-password',
      })
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      'Your password was changed.'
    )
    await waitFor(() =>
      expect(screen.getByLabelText('Current password')).toHaveValue('')
    )
  })

  it('marks the current password when the backend says it is wrong', async () => {
    mocks.changePassword.mockResolvedValue({
      ok: false,
      status: 400,
      code: 'AUTH_WRONG_PASSWORD',
    })
    renderForm(<PasswordForm viewerId={42} email="me@example.com" />)

    await fill('nope')

    expect(
      await screen.findByText("That isn't your current password.")
    ).toBeVisible()
    expect(mocks.toastError).not.toHaveBeenCalled()
  })

  it('refuses a repeat that does not match before calling the server', async () => {
    renderForm(<PasswordForm viewerId={42} email="me@example.com" />)

    await fill('old-pass', 'new-password', 'other-password')

    expect(
      await screen.findByText("The two passwords don't match.")
    ).toBeVisible()
    expect(mocks.changePassword).not.toHaveBeenCalled()
  })
})
