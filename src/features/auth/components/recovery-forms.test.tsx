import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../../../messages/en.json'
import { ForgotPasswordForm } from './forgot-password-form'
import { ResetPasswordForm } from './reset-password-form'
import { renderAuth } from './test-utils'

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

// `secureRandomToken()` is 32 random bytes as base64url: 43 characters.
const resetToken = 'q7Xv2mZk9LwR4tYb1NcH8sJd5GfP3aUe6oIi0TrKyQw'

beforeEach(() => {
  vi.clearAllMocks()
  for (const action of Object.values(mocked.actions)) {
    action.mockResolvedValue({ ok: true, data: null })
  }
})

describe('ForgotPasswordForm', () => {
  async function request(email = 'creator@example.com') {
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(en.auth.fields.email), email)
    await user.click(
      screen.getByRole('button', { name: en.auth.forgot.submit })
    )
    return user
  }

  it('validates the email before calling the mutation', async () => {
    renderAuth(<ForgotPasswordForm />)
    await request('not-an-email')
    expect(
      await screen.findByText(en.auth.validation.email)
    ).toBeInTheDocument()
    expect(mocked.actions.requestPasswordResetForHook).not.toHaveBeenCalled()
  })

  it('confirms without claiming that an account exists', async () => {
    renderAuth(<ForgotPasswordForm returnTo="/settings" />)
    await request('  creator@example.com ')
    expect(await screen.findByRole('status')).toHaveTextContent(
      en.auth.forgot.sent
    )
    expect(mocked.actions.requestPasswordResetForHook).toHaveBeenCalledWith({
      email: 'creator@example.com',
    })
    expect(en.auth.forgot.sent).toMatch(/^If an account/)
    expect(
      screen.getByRole('link', { name: en.auth.forgot.haveToken })
    ).toHaveAttribute(
      'href',
      expect.stringContaining('/auth/reset-password?returnTo=%2Fsettings')
    )
    expect(document.body).not.toHaveTextContent('creator@example.com')
  })

  it('can go back to ask again', async () => {
    renderAuth(<ForgotPasswordForm />)
    const user = await request()
    await screen.findByRole('status')
    await user.click(
      screen.getByRole('button', { name: en.auth.forgot.tryAgain })
    )
    expect(screen.getByLabelText(en.auth.fields.email)).toHaveValue('')
    expect(mocked.actions.requestPasswordResetForHook).toHaveBeenCalledTimes(1)
  })

  it('reports the throttle and stays on the form', async () => {
    mocked.actions.requestPasswordResetForHook.mockResolvedValue({
      ok: false,
      status: 429,
    })
    renderAuth(<ForgotPasswordForm />)
    await request()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.errors.rateLimited
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('ResetPasswordForm', () => {
  async function submit(token: string, password: string) {
    const user = userEvent.setup()
    if (token) {
      await user.type(screen.getByLabelText(en.auth.fields.resetToken), token)
    }
    if (password) {
      await user.type(
        screen.getByLabelText(en.auth.fields.newPassword),
        password
      )
    }
    await user.click(screen.getByRole('button', { name: en.auth.reset.submit }))
  }

  it('resets, then offers sign-in instead of signing in', async () => {
    renderAuth(<ResetPasswordForm returnTo="/settings" />)
    await submit(` ${resetToken} `, 'brand-new-pass')
    expect(await screen.findByRole('status')).toHaveTextContent(
      en.auth.reset.done
    )
    expect(mocked.actions.confirmPasswordResetForHook).toHaveBeenCalledWith({
      token: resetToken,
      newPassword: 'brand-new-pass',
    })
    expect(mocked.replace).not.toHaveBeenCalled()
    expect(mocked.actions.loginForHook).not.toHaveBeenCalled()
    expect(
      screen.getByRole('link', { name: en.auth.reset.login })
    ).toHaveAttribute(
      'href',
      expect.stringContaining('/auth/login?returnTo=%2Fsettings')
    )
  })

  it('leaves the token nowhere after a reset', async () => {
    renderAuth(<ResetPasswordForm />)
    await submit(resetToken, 'brand-new-pass')
    await screen.findByRole('status')
    expect(document.documentElement.innerHTML).not.toContain(resetToken)
    expect(window.location.href).not.toContain(resetToken)
    expect(JSON.stringify({ ...window.localStorage })).not.toContain(resetToken)
    expect(JSON.stringify({ ...window.sessionStorage })).not.toContain(
      resetToken
    )
  })

  it('shows one message for a bad token and keeps the form', async () => {
    mocked.actions.confirmPasswordResetForHook.mockResolvedValue({
      ok: false,
      status: 400,
      code: 'AUTH_INVALID_RESET_TOKEN',
    })
    renderAuth(<ResetPasswordForm />)
    await submit(resetToken, 'brand-new-pass')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.errors.invalidResetToken
    )
    expect(screen.getByLabelText(en.auth.fields.resetToken)).toHaveAttribute(
      'aria-invalid',
      'true'
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: en.auth.reset.requestToken })
    ).toHaveAttribute('href', expect.stringContaining('/auth/forgot-password'))
  })

  it('refuses a short password before calling the mutation', async () => {
    renderAuth(<ResetPasswordForm />)
    await submit(resetToken, 'short')
    expect(
      await screen.findByText(en.auth.validation.passwordLength)
    ).toBeInTheDocument()
    expect(mocked.actions.confirmPasswordResetForHook).not.toHaveBeenCalled()
  })

  it('refuses a partial token before calling the mutation', async () => {
    renderAuth(<ResetPasswordForm />)
    await submit('too-short', 'brand-new-pass')
    expect(
      await screen.findByText(en.auth.validation.resetToken)
    ).toBeInTheDocument()
    expect(mocked.actions.confirmPasswordResetForHook).not.toHaveBeenCalled()
  })

  it('allows another try after a failure', async () => {
    mocked.actions.confirmPasswordResetForHook
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        code: 'AUTH_INVALID_RESET_TOKEN',
      })
      .mockResolvedValueOnce({ ok: true, data: null })
    renderAuth(<ResetPasswordForm />)
    await submit(resetToken, 'brand-new-pass')
    await screen.findByRole('alert')
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: en.auth.reset.submit }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(en.auth.reset.done)
    )
    expect(mocked.actions.confirmPasswordResetForHook).toHaveBeenCalledTimes(2)
  })
})
