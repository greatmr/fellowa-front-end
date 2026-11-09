import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as I18nNavigation from '@/i18n/navigation'

import { renderWithIntl } from '../../../../test/render'

// The server boundary is covered by server/actions.test.ts; the real hooks run.
const mocks = vi.hoisted(() => ({
  updatePersonal: vi.fn(),
  changePassword: vi.fn(),
  updatePageName: vi.fn(),
  setFirstPassword: vi.fn(),
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))
vi.mock('@/features/settings/server/actions', () => ({
  updatePersonalAction: mocks.updatePersonal,
  changePasswordAction: mocks.changePassword,
  updatePageNameAction: mocks.updatePageName,
  setFirstPasswordAction: mocks.setFirstPassword,
}))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nNavigation>()),
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}))

const { PersonalForm } = await import('./personal-form')
const { PasswordForm } = await import('./password-form')
const { PageNameForm } = await import('./page-name-form')
const { FirstPasswordForm } = await import('./first-password-form')
const { SettingsView } = await import('./settings-view')

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

describe('FirstPasswordForm (FE-AUTH-05)', () => {
  async function fill(next = 'first-pass', repeat = next) {
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Password'), next)
    await user.type(screen.getByLabelText('Repeat the password'), repeat)
    await user.click(screen.getByRole('button', { name: 'Set password' }))
  }

  it('asks for no current password', () => {
    renderForm(<FirstPasswordForm viewerId={42} email={null} />)

    expect(screen.queryByLabelText('Current password')).toBeNull()
    expect(screen.getByText('At least 8 characters.')).toBeVisible()
  })

  it('sends only the new password, then reads the page again', async () => {
    mocks.setFirstPassword.mockResolvedValue({ ok: true, data: null })
    renderForm(<FirstPasswordForm viewerId={42} email={null} />)

    await fill()

    await waitFor(() =>
      expect(mocks.setFirstPassword).toHaveBeenCalledWith(42, {
        password: 'first-pass',
      })
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Your password was set.')
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  it('reads the page again when the account already has a password', async () => {
    mocks.setFirstPassword.mockResolvedValue({
      ok: false,
      status: 409,
      code: 'AUTH_PASSWORD_ALREADY_SET',
    })
    renderForm(<FirstPasswordForm viewerId={42} email={null} />)

    await fill()

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce())
    expect(mocks.toastError).toHaveBeenCalledWith(
      'This account already has a password. You can change it here.'
    )
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it.each([
    [401, 'Your session ended. Sign in again.'],
    [500, "That didn't save. Try again."],
  ])('reports a %i without reading the page again', async (status, text) => {
    mocks.setFirstPassword.mockResolvedValue({ ok: false, status })
    renderForm(<FirstPasswordForm viewerId={42} email={null} />)

    await fill()

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(text))
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it.each([
    ['short', 'short', 'Use at least 8 characters.'],
    ['first-pass', 'other-pass', "The two passwords don't match."],
  ])(
    'refuses %j / %j before calling the server',
    async (next, repeat, message) => {
      renderForm(<FirstPasswordForm viewerId={42} email={null} />)

      await fill(next, repeat)

      expect(await screen.findByText(message)).toBeVisible()
      expect(mocks.setFirstPassword).not.toHaveBeenCalled()
    }
  )
})

describe('PageNameForm (FE-AUTH-03)', () => {
  const field = () => screen.getByLabelText('Page name')
  const save = () => screen.getByRole('button', { name: 'Save' })

  it('starts from the saved name and saves a new one, trimmed', async () => {
    mocks.updatePageName.mockImplementation(async (_viewer, name) => ({
      ok: true,
      data: name,
    }))
    const user = userEvent.setup()
    renderForm(<PageNameForm viewerId={42} initial="Dana" />)

    expect(field()).toHaveValue('Dana')
    expect(save()).toBeDisabled()
    await user.clear(field())
    await user.type(field(), '  Dana Studio ')
    await user.click(save())

    await waitFor(() =>
      expect(mocks.updatePageName).toHaveBeenCalledWith(42, 'Dana Studio')
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Your page name was saved.')
    await waitFor(() => expect(field()).toHaveValue('Dana Studio'))
    expect(save()).toBeDisabled()
  })

  it('clears the name when saved empty', async () => {
    mocks.updatePageName.mockResolvedValue({ ok: true, data: null })
    const user = userEvent.setup()
    renderForm(<PageNameForm viewerId={42} initial="Dana" />)

    await user.clear(field())
    await user.click(save())

    await waitFor(() =>
      expect(mocks.updatePageName).toHaveBeenCalledWith(42, null)
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      'Page name cleared. Your @username is shown instead.'
    )
  })

  it('refuses a one-character name before calling the server', async () => {
    const user = userEvent.setup()
    renderForm(<PageNameForm viewerId={42} initial={null} />)

    await user.type(field(), 'D')
    await user.click(save())

    expect(
      await screen.findByText('Use 2 to 80 characters, or leave it empty.')
    ).toBeVisible()
    expect(mocks.updatePageName).not.toHaveBeenCalled()
  })

  it('says a page address comes first when the backend has no page', async () => {
    mocks.updatePageName.mockResolvedValue({
      ok: false,
      status: 400,
      code: 'USER_ALIAS_REQUIRED',
    })
    const user = userEvent.setup()
    renderForm(<PageNameForm viewerId={42} initial={null} />)

    await user.type(field(), 'Dana')
    await user.click(save())

    expect(
      await screen.findByText(
        'Choose your page address before naming the page.'
      )
    ).toBeVisible()
    expect(mocks.toastError).not.toHaveBeenCalled()
  })

  it('reports any other failure as a failed save', async () => {
    mocks.updatePageName.mockResolvedValue({ ok: false, status: 500 })
    const user = userEvent.setup()
    renderForm(<PageNameForm viewerId={42} initial={null} />)

    await user.type(field(), 'Dana')
    await user.click(save())

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "That didn't save. Try again."
      )
    )
  })
})

describe('SettingsView page name section', () => {
  const view = (page: { hasPage: boolean; pageName: string | null } | null) =>
    renderForm(
      <SettingsView
        viewerId={42}
        email="me@example.com"
        isVerified
        personal={{ firstName: '', lastName: '', phoneNumber: '' }}
        page={page}
        password={{ hasPassword: true, hasDisplayName: true }}
        heading={<h1>Settings</h1>}
      />
    )

  it('edits the name of an existing page', () => {
    view({ hasPage: true, pageName: 'Dana Studio' })

    expect(screen.getByLabelText('Page name')).toHaveValue('Dana Studio')
  })

  it('sends an account with no page to choose its address first', () => {
    view({ hasPage: false, pageName: null })

    expect(screen.queryByLabelText('Page name')).toBeNull()
    expect(
      screen
        .getByRole('link', { name: 'Choose a page address' })
        .getAttribute('href')
    ).toMatch(/\/onboarding\?step=username$/)
  })

  it('degrades only this section when the name could not be read', () => {
    view(null)

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Your page name couldn't be loaded. Try again later."
    )
    expect(screen.getByLabelText('First name')).toBeInTheDocument()
  })
})

describe('SettingsView password section (FE-AUTH-05)', () => {
  const view = (password: { hasPassword: boolean; hasDisplayName: boolean }) =>
    renderForm(
      <SettingsView
        viewerId={42}
        email={null}
        isVerified
        personal={{ firstName: '', lastName: '', phoneNumber: '' }}
        page={{ hasPage: true, pageName: null }}
        password={password}
        heading={<h1>Settings</h1>}
      />
    )

  it('changes an existing password with the current one', () => {
    view({ hasPassword: true, hasDisplayName: true })

    expect(screen.getByLabelText('Current password')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Set a password' })).toBeNull()
  })

  it('sets a first password without the current one', () => {
    view({ hasPassword: false, hasDisplayName: true })

    expect(
      screen.getByRole('heading', { name: 'Set a password' })
    ).toBeVisible()
    expect(screen.queryByLabelText('Current password')).toBeNull()
    expect(screen.getByRole('button', { name: 'Set password' })).toBeVisible()
  })

  it('asks an account with no name for one first, then comes back', () => {
    view({ hasPassword: false, hasDisplayName: false })

    expect(screen.queryByRole('button', { name: 'Set password' })).toBeNull()
    expect(
      screen.getByRole('link', { name: 'Add your name' }).getAttribute('href')
    ).toMatch(/\/auth\/account\?returnTo=%2Fsettings$/)
  })
})
