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
  getTierCoverForHook,
  listTierRolesForHook,
  listTiersForHook,
  updateTierForHook,
  uploadTierCoverForHook,
} from '@/features/tiers/server/actions'
import type {
  CreateTierPayload,
  Tier,
  TierCover,
  TierRole,
  UpdateTierPayload,
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
  details: (viewerId: number) => ['tiers', 'detail', viewerId] as const,
  cover: (viewerId: number, tierId: number) =>
    ['tiers', 'detail', viewerId, tierId, 'cover'] as const,
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

const validId = (value: number) => Number.isSafeInteger(value) && value > 0

export function useTiersQuery(
  viewerId: number,
  options?: QueryOptions<Tier[]>
) {
  return useQuery<Tier[], ApiError>({
    ...options,
    queryKey: tierKeys.list(viewerId),
    queryFn: async () =>
      unwrapApiActionResult(await listTiersForHook(viewerId)),
    enabled: validId(viewerId),
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
    enabled: validId(viewerId),
  })
}

/** The saved cover's URL, which `GET /tire` does not give. */
export function useTierCoverQuery(viewerId: number, tierId: number | null) {
  return useQuery<TierCover | null, ApiError>({
    queryKey: tierKeys.cover(viewerId, tierId ?? 0),
    queryFn: async () =>
      unwrapApiActionResult(await getTierCoverForHook(viewerId, tierId ?? 0)),
    enabled: validId(viewerId) && tierId !== null && validId(tierId),
  })
}

/** Uploads only; the cover joins a tier when the tier is saved. */
export function useUploadTierCoverMutation(viewerId: number) {
  return useMutation<TierCover, ApiError, File>({
    mutationKey: tierKeys.mutation('cover', viewerId),
    mutationFn: async (image) => {
      const form = new FormData()
      form.append('image', image)
      return unwrapApiActionResult(await uploadTierCoverForHook(viewerId, form))
    },
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tierKeys.list(viewerId) }),
        queryClient.invalidateQueries({
          queryKey: tierKeys.details(viewerId),
        }),
      ])
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
  options?: MutationOptions<number, UpdateTierPayload>
) {
  return useTierMutation('update', viewerId, updateTierForHook, options)
}

export function useDeleteTierMutation(
  viewerId: number,
  options?: MutationOptions<null, number>
) {
  return useTierMutation('delete', viewerId, deleteTierForHook, options)
}
