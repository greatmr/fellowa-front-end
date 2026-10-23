import { act, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { AuthActionState, AuthFormAction } from '@/features/auth/types'

import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'
import { deferred, renderAuth } from './test-utils'
import { VerificationForm } from './verification-form'

const idle: AuthFormAction = async () => ({ status: 'idle' })

describe('VerificationForm', () => {
  it('renders native resend confirmation before any client action', () => {
    const resend = vi.fn<AuthFormAction>(idle)
    renderAuth(
      <VerificationForm
        email="person@example.com"
        verifyAction={idle}
        resendAction={resend}
        changeAccountAction={idle}
        initialState={{ status: 'sent' }}
      />
    )
    expect(screen.getByRole('status')).toHaveTextContent(en.auth.verify.sent)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(resend).not.toHaveBeenCalled()
  })

  it('renders native invalid-code and field feedback with accessible associations before any client action', () => {
    const verify = vi.fn<AuthFormAction>(idle)
    renderAuth(
      <VerificationForm
        email="person@example.com"
        verifyAction={verify}
        resendAction={idle}
        changeAccountAction={idle}
        initialState={{
          status: 'error',
          error: 'invalidCode',
          fieldErrors: { code: 'code' },
        }}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      en.auth.errors.invalidCode
    )
    const code = screen.getByLabelText(en.auth.fields.code)
    expect(code).toHaveAttribute('aria-invalid', 'true')
    expect(code).toHaveAccessibleDescription(
      `${en.auth.verify.codeHint} ${en.auth.validation.code}`
    )
    expect(verify).not.toHaveBeenCalled()
    expect(code).toHaveValue('')
  })

  it.each([
    { locale: 'en', messages: en },
    { locale: 'fa', messages: fa },
  ] as const)(
    'uses the real six-digit email contract and translated account switching in $locale',
    ({ locale, messages }) => {
      renderAuth(
        <VerificationForm
          email="person@example.com"
          verifyAction={idle}
          resendAction={idle}
          changeAccountAction={idle}
          returnTo="/studio"
        />,
        { locale }
      )
      const code = screen.getByLabelText(messages.auth.fields.code)
      expect(
        screen.getByRole('heading', { name: messages.auth.verify.title })
      ).toBeInTheDocument()
      expect(
        screen.getByText('person@example.com').closest('bdi')
      ).toHaveAttribute('dir', 'ltr')
      expect(code).toHaveAttribute('autocomplete', 'one-time-code')
      expect(code).toHaveAttribute('inputmode', 'numeric')
      expect(code).toHaveAttribute('maxlength', '6')
      expect(
        screen.getByRole('button', { name: messages.auth.verify.changeAccount })
      ).toHaveAttribute('type', 'submit')
    }
  )

  it('blocks missing, short, and non-numeric codes before any action call', async () => {
    const user = userEvent.setup()
    const verify = vi.fn<AuthFormAction>(idle)
    renderAuth(
      <VerificationForm
        email="person@example.com"
        verifyAction={verify}
        resendAction={idle}
        changeAccountAction={idle}
      />
    )
    const code = screen.getByLabelText(en.auth.fields.code)
    for (const value of ['', '12345', 'abcdef']) {
      await user.clear(code)
      if (value) await user.type(code, value)
      await user.click(
        screen.getByRole('button', { name: en.auth.verify.submit })
      )
      expect(
        await screen.findByText(en.auth.validation.code)
      ).toBeInTheDocument()
      expect(code).toHaveAccessibleDescription(
        `${en.auth.verify.codeHint} ${en.auth.validation.code}`
      )
    }
    expect(verify).not.toHaveBeenCalled()
  })

  it('submits the exact six-digit code, clears identity cache, and shows invalid-code feedback', async () => {
    const user = userEvent.setup()
    const verify = vi.fn<AuthFormAction>(async () => ({
      status: 'error',
      error: 'invalidCode',
    }))
    const { queryClient } = renderAuth(
      <VerificationForm
        email="person@example.com"
        verifyAction={verify}
        resendAction={idle}
        changeAccountAction={idle}
      />
    )
    queryClient.setQueryData(['private'], { viewer: 1 })
    await user.type(screen.getByLabelText(en.auth.fields.code), '012345')
    await user.click(
      screen.getByRole('button', { name: en.auth.verify.submit })
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.errors.invalidCode
    )
    expect(verify.mock.calls[0][1].get('code')).toBe('012345')
    expect(verify.mock.calls[0][1].get('email')).toBeNull()
    expect(queryClient.getQueryData(['private'])).toBeUndefined()
  })

  it('blocks verification, resend, and duplicate requests while resend is pending, then reports the actual result', async () => {
    const user = userEvent.setup()
    const response = deferred<AuthActionState>()
    const resend = vi.fn<AuthFormAction>(() => response.promise)
    const verify = vi.fn<AuthFormAction>(idle)
    renderAuth(
      <VerificationForm
        email="person@example.com"
        verifyAction={verify}
        resendAction={resend}
        changeAccountAction={idle}
      />
    )
    const button = screen.getByRole('button', { name: en.auth.verify.resend })
    const form = button.closest('form')
    if (!form) throw new Error('Expected the resend form')
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(
      await screen.findByRole('button', { name: en.auth.verify.resending })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: en.auth.verify.submit })
    ).toBeDisabled()
    expect(screen.getByLabelText(en.auth.fields.code)).toBeDisabled()
    expect(resend).toHaveBeenCalledTimes(1)
    expect(verify).not.toHaveBeenCalled()
    expect(screen.queryByText(en.auth.verify.sent)).not.toBeInTheDocument()
    await act(async () => response.resolve({ status: 'sent' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      en.auth.verify.sent
    )
    expect(
      screen.getByRole('button', { name: en.auth.verify.resend })
    ).toBeEnabled()
    await user.click(
      screen.getByRole('button', { name: en.auth.verify.resend })
    )
    expect(resend).toHaveBeenCalledTimes(2)
  })

  it('blocks resend while verification is pending and links returned field errors', async () => {
    const user = userEvent.setup()
    const response = deferred<AuthActionState>()
    renderAuth(
      <VerificationForm
        email="person@example.com"
        verifyAction={() => response.promise}
        resendAction={idle}
        changeAccountAction={idle}
      />
    )
    const code = screen.getByLabelText(en.auth.fields.code)
    await user.type(code, '123456')
    await user.click(
      screen.getByRole('button', { name: en.auth.verify.submit })
    )
    expect(
      await screen.findByRole('button', { name: en.auth.verify.pending })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: en.auth.verify.resend })
    ).toBeDisabled()
    await act(async () =>
      response.resolve({ status: 'error', fieldErrors: { code: 'code' } })
    )
    expect(await screen.findByText(en.auth.validation.code)).toBeInTheDocument()
    expect(code).toHaveAttribute('aria-invalid', 'true')
    expect(code).toHaveAccessibleDescription(
      `${en.auth.verify.codeHint} ${en.auth.validation.code}`
    )
  })

  it('recovers from an expired verification session through sign in', async () => {
    const user = userEvent.setup()
    const expired: AuthFormAction = async () => ({
      status: 'error',
      error: 'expiredSession',
    })
    renderAuth(
      <VerificationForm
        email="person@example.com"
        verifyAction={idle}
        resendAction={expired}
        changeAccountAction={idle}
      />
    )
    await user.click(
      screen.getByRole('button', { name: en.auth.verify.resend })
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.sessionExpired.title
    )
    expect(
      screen.getByRole('link', { name: en.auth.sessionExpired.login })
    ).toHaveAttribute('href', '/en/auth/login')
    expect(
      screen.getByRole('button', { name: en.auth.verify.submit })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: en.auth.verify.resend })
    ).toBeDisabled()
  })

  it('replaces stale verification errors with resend status and clears that status on the next verification', async () => {
    const user = userEvent.setup()
    const invalid: AuthFormAction = async () => ({
      status: 'error',
      error: 'invalidCode',
      fieldErrors: { code: 'code' },
    })
    const sent: AuthFormAction = async () => ({ status: 'sent' })
    renderAuth(
      <VerificationForm
        email="person@example.com"
        verifyAction={invalid}
        resendAction={sent}
        changeAccountAction={idle}
      />
    )
    const code = screen.getByLabelText(en.auth.fields.code)
    await user.type(code, '123456')
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
    expect(code).toHaveAttribute('aria-invalid', 'false')
    await user.click(
      screen.getByRole('button', { name: en.auth.verify.submit })
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.errors.invalidCode
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('switches accounts through the real sign-out action and blocks competing submissions', async () => {
    const response = deferred<AuthActionState>()
    const changeAccount = vi.fn<AuthFormAction>(() => response.promise)
    const { queryClient } = renderAuth(
      <VerificationForm
        email="person@example.com"
        verifyAction={idle}
        resendAction={idle}
        changeAccountAction={changeAccount}
      />
    )
    queryClient.setQueryData(['private'], { viewer: 1 })
    const form = screen
      .getByRole('button', { name: en.auth.verify.changeAccount })
      .closest('form')
    if (!form) throw new Error('Expected the account-switch form')
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(queryClient.getQueryData(['private'])).toBeUndefined()
    expect(
      await screen.findByRole('button', { name: en.auth.nav.loggingOut })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: en.auth.verify.submit })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: en.auth.verify.resend })
    ).toBeDisabled()
    expect(changeAccount).toHaveBeenCalledTimes(1)
    await act(async () =>
      response.resolve({ status: 'error', error: 'network' })
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.errors.network
    )
    expect(
      screen.getByRole('button', { name: en.auth.verify.changeAccount })
    ).toBeEnabled()
  })
})
