import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../../../messages/en.json'
import { CredentialsForm } from './credentials-form'
import { LogoutButton } from './logout-button'
import { deferred, renderAuth } from './test-utils'
import { VerificationForm } from './verification-form'

const mocked = vi.hoisted(() => ({
  replace: vi.fn(),
  actions: {
    loginForHook: vi.fn(),
    registerForHook: vi.fn(),
    ownProfileForHook: vi.fn(),
    verifyEmailForHook: vi.fn(),
    resendEmailForHook: vi.fn(),
    setAliasForHook: vi.fn(),
    requestPasswordResetForHook: vi.fn(),
    confirmPasswordResetForHook: vi.fn(),
    changePasswordForHook: vi.fn(),
    exchangeGoogleCodeForHook: vi.fn(),
    verifyAuthTokenForHook: vi.fn(),
    logoutForHook: vi.fn(),
  },
}))
vi.mock('@/features/auth/server/hook-actions', () => mocked.actions)
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRouter: () => ({ replace: mocked.replace }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  for (const action of Object.values(mocked.actions)) {
    action.mockResolvedValue({ ok: true, data: null })
  }
})

describe('React Query auth forms', () => {
  it('validates credentials before calling the login mutation', async () => {
    const user = userEvent.setup()
    renderAuth(<CredentialsForm mode="login" />)
    await user.click(screen.getByRole('button', { name: en.auth.login.submit }))
    expect(
      await screen.findByText(en.auth.validation.email)
    ).toBeInTheDocument()
    expect(
      screen.getByText(en.auth.validation.passwordRequired)
    ).toBeInTheDocument()
    expect(mocked.actions.loginForHook).not.toHaveBeenCalled()
  })

  it('clears previous viewer data and navigates after a verified login', async () => {
    const user = userEvent.setup()
    mocked.actions.loginForHook.mockResolvedValue({
      ok: true,
      data: {
        id: 42,
        email: 'creator@example.com',
        alias: null,
        isVerified: true,
      },
    })
    const { queryClient } = renderAuth(
      <CredentialsForm mode="login" returnTo="/settings" />
    )
    queryClient.setQueryData(['private'], { viewer: 9 })
    await user.type(
      screen.getByLabelText(en.auth.fields.email),
      'creator@example.com'
    )
    await user.type(screen.getByLabelText(en.auth.fields.password), 'password')
    await user.click(screen.getByRole('button', { name: en.auth.login.submit }))
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith('/settings')
    )
    expect(queryClient.getQueryData(['private'])).toBeUndefined()
    expect(mocked.actions.loginForHook).toHaveBeenCalledWith({
      email: 'creator@example.com',
      password: 'password',
    })
  })

  it('sends a newly registered unverified account to email verification', async () => {
    const user = userEvent.setup()
    mocked.actions.registerForHook.mockResolvedValue({
      ok: true,
      data: {
        id: 42,
        email: 'creator@example.com',
        alias: null,
        isVerified: false,
      },
    })
    renderAuth(<CredentialsForm mode="register" returnTo="/studio/posts" />)
    await user.type(
      screen.getByLabelText(en.auth.fields.email),
      'creator@example.com'
    )
    await user.type(screen.getByLabelText(en.auth.fields.password), 'password')
    await user.click(
      screen.getByRole('button', { name: en.auth.register.submit })
    )
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith({
        pathname: '/auth/verify-email',
        query: { returnTo: '/studio/posts' },
      })
    )
  })

  it('renders normalized invalid-credential feedback from the mutation', async () => {
    const user = userEvent.setup()
    mocked.actions.loginForHook.mockResolvedValue({
      ok: false,
      status: 401,
      code: 'AUTH_INVALID_CREDENTIALS',
    })
    renderAuth(<CredentialsForm mode="login" />)
    await user.type(
      screen.getByLabelText(en.auth.fields.email),
      'creator@example.com'
    )
    await user.type(screen.getByLabelText(en.auth.fields.password), 'password')
    await user.click(screen.getByRole('button', { name: en.auth.login.submit }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.errors.invalidCredentials
    )
    expect(mocked.replace).not.toHaveBeenCalled()
  })

  it('hides an old credential error while a retry is pending', async () => {
    const user = userEvent.setup()
    const retry = deferred<{
      ok: true
      data: { id: number; email: string; alias: null; isVerified: boolean }
    }>()
    mocked.actions.loginForHook
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        code: 'AUTH_INVALID_CREDENTIALS',
      })
      .mockImplementationOnce(() => retry.promise)
    renderAuth(<CredentialsForm mode="login" />)
    await user.type(
      screen.getByLabelText(en.auth.fields.email),
      'creator@example.com'
    )
    await user.type(screen.getByLabelText(en.auth.fields.password), 'password')
    await user.click(screen.getByRole('button', { name: en.auth.login.submit }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.errors.invalidCredentials
    )
    await user.click(screen.getByRole('button', { name: en.auth.login.submit }))
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    )
    retry.resolve({
      ok: true,
      data: {
        id: 42,
        email: 'creator@example.com',
        alias: null,
        isVerified: true,
      },
    })
    await waitFor(() => expect(mocked.replace).toHaveBeenCalledWith('/studio'))
  })

  it('shows verification errors and resend success from separate mutations', async () => {
    const user = userEvent.setup()
    mocked.actions.verifyEmailForHook.mockResolvedValue({
      ok: false,
      status: 400,
      code: 'AUTH_INVALID_CODE',
    })
    renderAuth(<VerificationForm email="creator@example.com" />)
    await user.type(screen.getByLabelText(en.auth.fields.code), '012345')
    await user.click(
      screen.getByRole('button', { name: en.auth.verify.submit })
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.errors.invalidCode
    )
    await user.click(
      screen.getByRole('button', { name: en.auth.verify.resend })
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      en.auth.verify.sent
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('clears the local session through the logout mutation', async () => {
    const user = userEvent.setup()
    renderAuth(<LogoutButton />)
    await user.click(screen.getByRole('button', { name: en.auth.nav.logout }))
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith('/auth/login')
    )
    expect(mocked.actions.logoutForHook).toHaveBeenCalledWith(undefined)
  })
})
