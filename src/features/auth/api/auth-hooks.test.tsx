import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const actions = vi.hoisted(() => ({
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
}))
vi.mock('@/features/auth/server/hook-actions', () => actions)

import {
  authKeys,
  useLoginMutation,
  useOwnProfileQuery,
  useSetAliasMutation,
} from './auth-hooks'

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  }
}

beforeEach(() => vi.clearAllMocks())

describe('React Query auth hooks', () => {
  it('uses a static mutation key and removes previous viewer data when signing in', async () => {
    const { client, wrapper } = setup()
    client.setQueryData(authKeys.profile(9), { id: 9 })
    actions.loginForHook.mockResolvedValue({
      ok: true,
      data: {
        id: 42,
        email: 'creator@example.com',
        alias: null,
        isVerified: true,
      },
    })
    const { result } = renderHook(() => useLoginMutation(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({
        email: 'creator@example.com',
        password: 'password',
      })
    })
    expect(client.getQueryData(authKeys.profile(9))).toBeUndefined()
    expect(actions.loginForHook).toHaveBeenCalledWith({
      email: 'creator@example.com',
      password: 'password',
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe(42)
    expect(result.current.error).toBeNull()
    expect(client.getMutationCache().getAll()[0]?.options.mutationKey).toEqual([
      'auth',
      'login',
    ])
  })

  it('keys profile data by user ID and rejects cross-session results', async () => {
    const { client, wrapper } = setup()
    actions.ownProfileForHook.mockResolvedValue({
      ok: false,
      status: 403,
    })
    const { result } = renderHook(() => useOwnProfileQuery(42), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ status: 403 })
    expect(actions.ownProfileForHook).toHaveBeenCalledWith(42)
    expect(client.getQueryData(authKeys.profile(42))).toBeUndefined()
    expect(client.getQueryData(authKeys.profile(9))).toBeUndefined()
  })

  it('invalidates profile data after alias changes and retains normalized API errors', async () => {
    const { client, wrapper } = setup()
    client.setQueryData(authKeys.profile(42), { id: 42 })
    actions.setAliasForHook.mockResolvedValueOnce({ ok: true, data: null })
    const { result } = renderHook(() => useSetAliasMutation(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ alias: 'creator-name' })
    })
    expect(client.getQueryState(authKeys.profile(42))?.isInvalidated).toBe(true)

    actions.setAliasForHook.mockResolvedValueOnce({
      ok: false,
      status: 409,
      code: 'AUTH_ALIAS_TAKEN',
    })
    await act(async () => {
      await expect(
        result.current.mutateAsync({ alias: 'creator-name' })
      ).rejects.toMatchObject({
        status: 409,
        code: 'AUTH_ALIAS_TAKEN',
      })
    })
  })
})
