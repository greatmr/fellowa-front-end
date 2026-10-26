'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'

import {
  changePasswordForHook,
  confirmPasswordResetForHook,
  exchangeGoogleCodeForHook,
  loginForHook,
  logoutForHook,
  ownProfileForHook,
  registerForHook,
  requestPasswordResetForHook,
  resendEmailForHook,
  setAliasForHook,
  verifyAuthTokenForHook,
  verifyEmailForHook,
} from '@/features/auth/server/hook-actions'
import type {
  ConfirmPasswordResetPayload,
  CredentialsPayload,
  GoogleAuthPayload,
  ResetPasswordPayload,
} from '@/features/auth/types/auth-contract'
import type { AuthUser } from '@/features/auth/types'
import type { ApiError } from '@/lib/api/errors'
import {
  unwrapApiActionResult,
  type ApiActionResult,
} from '@/lib/api/action-result'

export const authKeys = {
  all: ['auth'] as const,
  profileAll: ['auth', 'own-profile'] as const,
  profile: (userId: number) => ['auth', 'own-profile', userId] as const,
  mutation: (name: string) => ['auth', name] as const,
}

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables>,
  'mutationFn' | 'mutationKey' | 'gcTime'
>

function useAuthMutation<TData, TVariables>(
  name: string,
  action: (variables: TVariables) => Promise<ApiActionResult<TData>>,
  cacheChange: 'identity' | 'profile' | null,
  options?: MutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient()
  return useMutation<TData, ApiError, TVariables>({
    ...options,
    mutationKey: authKeys.mutation(name),
    mutationFn: async (variables) =>
      unwrapApiActionResult(await action(variables)),
    gcTime: 0,
    onMutate: async (variables, context) => {
      if (cacheChange === 'identity') queryClient.removeQueries()
      return options?.onMutate?.(variables, context)
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      if (cacheChange === 'identity') queryClient.removeQueries()
      if (cacheChange === 'profile') {
        await queryClient.invalidateQueries({ queryKey: authKeys.profileAll })
      }
      await options?.onSuccess?.(data, variables, onMutateResult, context)
    },
  })
}

export function useLoginMutation(
  options?: MutationOptions<AuthUser, CredentialsPayload>
) {
  return useAuthMutation('login', loginForHook, 'identity', options)
}

export function useRegisterMutation(
  options?: MutationOptions<AuthUser, CredentialsPayload>
) {
  return useAuthMutation('register', registerForHook, 'identity', options)
}

export function useOwnProfileQuery(
  userId: number,
  options?: Omit<
    UseQueryOptions<AuthUser, ApiError>,
    'queryKey' | 'queryFn' | 'enabled'
  >
) {
  return useQuery<AuthUser, ApiError>({
    ...options,
    queryKey: authKeys.profile(userId),
    queryFn: async () => unwrapApiActionResult(await ownProfileForHook(userId)),
    enabled: Number.isSafeInteger(userId) && userId > 0,
    staleTime: 0,
  })
}

export function useVerifyEmailMutation(
  options?: MutationOptions<null, { code: string }>
) {
  return useAuthMutation('verify-email', verifyEmailForHook, 'profile', options)
}

export function useResendEmailMutation(options?: MutationOptions<null, void>) {
  return useAuthMutation('resend-email', resendEmailForHook, null, options)
}

export function useSetAliasMutation(
  options?: MutationOptions<null, { alias: string }>
) {
  return useAuthMutation('set-alias', setAliasForHook, 'profile', options)
}

export function useRequestPasswordResetMutation(
  options?: MutationOptions<null, { email: string }>
) {
  return useAuthMutation(
    'request-password-reset',
    requestPasswordResetForHook,
    null,
    options
  )
}

export function useConfirmPasswordResetMutation(
  options?: MutationOptions<null, ConfirmPasswordResetPayload>
) {
  return useAuthMutation(
    'confirm-password-reset',
    confirmPasswordResetForHook,
    null,
    options
  )
}

export function useChangePasswordMutation(
  options?: MutationOptions<null, ResetPasswordPayload>
) {
  return useAuthMutation(
    'change-password',
    changePasswordForHook,
    null,
    options
  )
}

export function useExchangeGoogleCodeMutation(
  options?: MutationOptions<AuthUser, GoogleAuthPayload>
) {
  return useAuthMutation(
    'google-code',
    exchangeGoogleCodeForHook,
    'identity',
    options
  )
}

export function useVerifyAuthTokenMutation(
  options?: MutationOptions<true, void>
) {
  return useAuthMutation('verify-token', verifyAuthTokenForHook, null, options)
}

export function useLogoutMutation(options?: MutationOptions<null, void>) {
  return useAuthMutation('logout', logoutForHook, 'identity', options)
}
