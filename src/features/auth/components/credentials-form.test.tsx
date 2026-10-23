import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { AuthActionState, AuthFormAction } from '@/features/auth/types'

import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'
import { CredentialsForm } from './credentials-form'
import { deferred, renderAuth } from './test-utils'

describe('CredentialsForm', () => {
  it('renders server-provided native form feedback before any client action', () => {
    const action = vi.fn<AuthFormAction>(async () => ({ status: 'idle' }))
    renderAuth(
      <CredentialsForm
        mode="login"
        action={action}
        initialState={{ status: 'error', error: 'invalidCredentials' }}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      en.auth.errors.invalidCredentials
    )
    expect(action).not.toHaveBeenCalled()
    expect(screen.getByLabelText(en.auth.fields.password)).toHaveValue('')
    expect(screen.getByLabelText(en.auth.fields.email)).toHaveValue('')
  })

  it.each([
    {
      mode: 'login',
      locale: 'en',
      messages: en,
      autocomplete: 'current-password',
      destination: '/en/auth/register',
    },
    {
      mode: 'register',
      locale: 'en',
      messages: en,
      autocomplete: 'new-password',
      destination: '/en/auth/login',
    },
    {
      mode: 'login',
      locale: 'fa',
      messages: fa,
      autocomplete: 'current-password',
      destination: '/auth/register',
    },
    {
      mode: 'register',
      locale: 'fa',
      messages: fa,
      autocomplete: 'new-password',
      destination: '/auth/login',
    },
  ] as const)(
    'renders the $mode form in $locale with locale-aware account navigation',
    ({ mode, locale, messages, autocomplete, destination }) => {
      const action: AuthFormAction = async () => ({ status: 'idle' })
      renderAuth(
        <CredentialsForm
          mode={mode}
          action={action}
          returnTo="/studio/posts"
        />,
        { locale }
      )
      expect(
        screen.getByRole('heading', { name: messages.auth[mode].title })
      ).toBeInTheDocument()
      expect(screen.getByLabelText(messages.auth.fields.email)).toHaveAttribute(
        'autocomplete',
        'email'
      )
      expect(screen.getByLabelText(messages.auth.fields.email)).toHaveAttribute(
        'dir',
        'ltr'
      )
      expect(
        screen.getByLabelText(messages.auth.fields.password)
      ).toHaveAttribute('autocomplete', autocomplete)
      expect(
        screen.getByLabelText(messages.auth.fields.password).parentElement
      ).toHaveAttribute('dir', 'ltr')
      expect(
        screen.getByRole('link', { name: messages.auth[mode].switchLink })
      ).toHaveAttribute('href', `${destination}?returnTo=%2Fstudio%2Fposts`)
    }
  )

  it('blocks invalid submissions, links validation messages, and leaves the query cache alone', async () => {
    const user = userEvent.setup()
    const action = vi.fn<AuthFormAction>(async () => ({ status: 'idle' }))
    const { queryClient } = renderAuth(
      <CredentialsForm mode="login" action={action} />
    )
    queryClient.setQueryData(['private'], { viewer: 1 })
    await user.click(screen.getByRole('button', { name: en.auth.login.submit }))

    const email = screen.getByLabelText(en.auth.fields.email)
    const password = screen.getByLabelText(en.auth.fields.password)
    expect(
      await screen.findByText(en.auth.validation.email)
    ).toBeInTheDocument()
    expect(
      screen.getByText(en.auth.validation.passwordRequired)
    ).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription(
      `${en.auth.emailHint} ${en.auth.validation.email}`
    )
    expect(password).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveFocus()
    expect(action).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(['private'])).toEqual({ viewer: 1 })
  })

  it('requires the backend registration password minimum and a valid email', async () => {
    const user = userEvent.setup()
    const action = vi.fn<AuthFormAction>(async () => ({ status: 'idle' }))
    renderAuth(<CredentialsForm mode="register" action={action} />)
    await user.type(screen.getByLabelText(en.auth.fields.email), 'invalid')
    await user.type(screen.getByLabelText(en.auth.fields.password), 'short')
    await user.click(
      screen.getByRole('button', { name: en.auth.register.submit })
    )
    expect(
      await screen.findByText(en.auth.validation.passwordLength)
    ).toBeInTheDocument()
    expect(screen.getByText(en.auth.validation.email)).toBeInTheDocument()
    expect(action).not.toHaveBeenCalled()
  })

  it('reveals the password and submits valid login credentials unchanged, clearing prior identity cache', async () => {
    const user = userEvent.setup()
    const action = vi.fn<AuthFormAction>(async () => ({
      status: 'error',
      error: 'invalidCredentials',
    }))
    const { queryClient } = renderAuth(
      <CredentialsForm mode="login" action={action} />
    )
    queryClient.setQueryData(['private'], { viewer: 1 })
    const password = screen.getByLabelText(en.auth.fields.password)
    await user.type(
      screen.getByLabelText(en.auth.fields.email),
      'person@example.com'
    )
    await user.type(password, ' x ')
    await user.click(
      screen.getByRole('button', { name: en.auth.password.show })
    )
    expect(password).toHaveAttribute('type', 'text')
    expect(
      screen.getByRole('button', { name: en.auth.password.hide })
    ).toHaveAttribute('aria-pressed', 'true')
    await user.click(
      screen.getByRole('button', { name: en.auth.password.hide })
    )
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: en.auth.login.submit }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.errors.invalidCredentials
    )
    expect(action).toHaveBeenCalledTimes(1)
    expect(action.mock.calls[0][1].get('password')).toBe(' x ')
    expect(action.mock.calls[0][1].get('email')).toBe('person@example.com')
    expect(queryClient.getQueryData(['private'])).toBeUndefined()
  })

  it('blocks duplicate submissions and editing until the real action settles, then permits retry', async () => {
    const user = userEvent.setup()
    const response = deferred<AuthActionState>()
    const action = vi.fn<AuthFormAction>(() => response.promise)
    renderAuth(<CredentialsForm mode="login" action={action} />)
    const email = screen.getByLabelText(en.auth.fields.email)
    await user.type(email, 'person@example.com')
    await user.type(screen.getByLabelText(en.auth.fields.password), 'password')
    const form = email.closest('form')
    if (!form) throw new Error('Expected the credentials form')
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(
      await screen.findByRole('button', { name: en.auth.login.pending })
    ).toBeDisabled()
    expect(email).toBeDisabled()
    expect(
      screen.getByRole('button', { name: en.auth.password.show })
    ).toBeDisabled()
    fireEvent.submit(form)
    expect(action).toHaveBeenCalledTimes(1)
    await act(async () =>
      response.resolve({ status: 'error', error: 'network' })
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.errors.network
    )
    expect(
      screen.getByRole('button', { name: en.auth.login.submit })
    ).toBeEnabled()
    await user.click(screen.getByRole('button', { name: en.auth.login.submit }))
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2))
  })

  it('translates server field errors and associates them with their inputs', async () => {
    const user = userEvent.setup()
    const action: AuthFormAction = async () => ({
      status: 'error',
      error: 'invalidRequest',
      fieldErrors: { email: 'email', password: 'passwordRequired' },
    })
    renderAuth(<CredentialsForm mode="login" action={action} />)
    const email = screen.getByLabelText(en.auth.fields.email)
    await user.type(email, 'person@example.com')
    await user.type(screen.getByLabelText(en.auth.fields.password), 'password')
    await user.click(screen.getByRole('button', { name: en.auth.login.submit }))
    expect(
      await screen.findByText(en.auth.validation.email)
    ).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription(
      `${en.auth.emailHint} ${en.auth.validation.email}`
    )
  })
})
