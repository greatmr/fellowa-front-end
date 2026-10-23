import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AuthActionState, AuthFormAction } from '@/features/auth/types'

import en from '../../../../messages/en.json'
import { LogoutButton } from './logout-button'
import { deferred, renderAuth } from './test-utils'

describe('LogoutButton', () => {
  it('immediately clears the current identity cache, blocks duplicates, and renders failure recovery', async () => {
    const response = deferred<AuthActionState>()
    const action = vi.fn<AuthFormAction>(() => response.promise)
    const { queryClient } = renderAuth(<LogoutButton action={action} />)
    queryClient.setQueryData(['private'], { viewer: 1 })
    const form = screen
      .getByRole('button', { name: en.auth.nav.logout })
      .closest('form')
    if (!form) throw new Error('Expected the sign-out form')
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(queryClient.getQueryData(['private'])).toBeUndefined()
    expect(
      await screen.findByRole('button', { name: en.auth.nav.loggingOut })
    ).toBeDisabled()
    expect(action).toHaveBeenCalledTimes(1)
    await act(async () =>
      response.resolve({ status: 'error', error: 'network' })
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.errors.network
    )
    expect(
      screen.getByRole('button', { name: en.auth.nav.logout })
    ).toBeEnabled()
  })
})
