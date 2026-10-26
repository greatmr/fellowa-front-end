'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'

import {
  createTierForHook,
  deleteTierForHook,
  listTierRolesForHook,
  listTiersForHook,
  updateTierForHook,
} from '@/features/tiers/server/actions'
import type {
  CreateTierPayload,
  Tier,
  TierRole,
} from '@/features/tiers/types/tier'
import {
  unwrapApiActionResult,
  type ApiActionResult,
} from '@/lib/api/action-result'
import type { ApiError } from '@/lib/api/errors'

export const tierKeys = {
  all: ['tiers'] as const,
  list: (viewerId: number) => ['tiers', 'list', viewerId] as const,
  roles: (viewerId: number) => ['tiers', 'roles', viewerId] as const,
  mutation: (name: string, viewerId: number) =>
    ['tiers', name, viewerId] as const,
}

type QueryOptions<T> = Omit<
  UseQueryOptions<T, ApiError>,
  'queryKey' | 'queryFn' | 'enabled'
>
type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables>,
  'mutationFn' | 'mutationKey'
>

export function useTiersQuery(
  viewerId: number,
  options?: QueryOptions<Tier[]>
) {
  return useQuery<Tier[], ApiError>({
    ...options,
    queryKey: tierKeys.list(viewerId),
    queryFn: async () =>
      unwrapApiActionResult(await listTiersForHook(viewerId)),
    enabled: Number.isSafeInteger(viewerId) && viewerId > 0,
  })
}

export function useTierRolesQuery(
  viewerId: number,
  options?: QueryOptions<TierRole[]>
) {
  return useQuery<TierRole[], ApiError>({
    ...options,
    queryKey: tierKeys.roles(viewerId),
    queryFn: async () =>
      unwrapApiActionResult(await listTierRolesForHook(viewerId)),
    enabled: Number.isSafeInteger(viewerId) && viewerId > 0,
  })
}

function useTierMutation<TData, TVariables>(
  name: string,
  viewerId: number,
  action: (
    viewerId: number,
    variables: TVariables
  ) => Promise<ApiActionResult<TData>>,
  options?: MutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient()
  return useMutation<TData, ApiError, TVariables>({
    ...options,
    mutationKey: tierKeys.mutation(name, viewerId),
    mutationFn: async (variables) =>
      unwrapApiActionResult(await action(viewerId, variables)),
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: tierKeys.list(viewerId) })
      await options?.onSuccess?.(data, variables, onMutateResult, context)
    },
  })
}

export function useCreateTierMutation(
  viewerId: number,
  options?: MutationOptions<number, CreateTierPayload>
) {
  return useTierMutation('create', viewerId, createTierForHook, options)
}

export function useUpdateTierMutation(
  viewerId: number,
  options?: MutationOptions<number, CreateTierPayload & { id: number }>
) {
  return useTierMutation('update', viewerId, updateTierForHook, options)
}

export function useDeleteTierMutation(
  viewerId: number,
  options?: MutationOptions<null, number>
) {
  return useTierMutation('delete', viewerId, deleteTierForHook, options)
}
