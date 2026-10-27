'use server'

import {
  createTier,
  deleteTier,
  listOwnTiers,
  listTierRoles,
  updateTier,
} from '@/features/tiers/api/tier-api'
import { readSession, validAuthRequestOrigin } from '@/features/auth/server'
import {
  InvalidTierResponseError,
  tierIdSchema,
  tierInputSchema,
  tierUpdateInputSchema,
} from '@/features/tiers/schemas/tier'
import type {
  CreateTierPayload,
  Tier,
  TierRole,
} from '@/features/tiers/types/tier'
import { runApiAction, type ApiActionResult } from '@/lib/api/action-result'
import { ApiError } from '@/lib/api/errors'

function execute<T>(operation: () => Promise<T>) {
  return runApiAction(operation, (error) =>
    error instanceof InvalidTierResponseError
      ? { code: 'INVALID_TIER_RESPONSE' }
      : undefined
  )
}

async function authorizedToken(viewerId: number): Promise<string> {
  const session = await readSession()
  if (!session) throw new ApiError({ message: 'Session expired', status: 401 })
  if (session.user.id !== viewerId || !session.user.isVerified) {
    throw new ApiError({ message: 'Forbidden', status: 403 })
  }
  return session.token
}

async function mutation<T>(
  operation: () => Promise<T>
): Promise<ApiActionResult<T>> {
  if (!(await validAuthRequestOrigin())) {
    return { ok: false, status: 403, code: 'INVALID_REQUEST' }
  }
  return execute(operation)
}

function invalidTier(): never {
  throw new ApiError({ message: 'Invalid tier', status: 400 })
}

export async function listTiersForHook(
  viewerId: number
): Promise<ApiActionResult<Tier[]>> {
  if (!tierIdSchema.safeParse(viewerId).success) {
    return { ok: false, status: 400, code: 'INVALID_REQUEST' }
  }
  return execute(async () => listOwnTiers(await authorizedToken(viewerId)))
}

export async function listTierRolesForHook(
  viewerId: number
): Promise<ApiActionResult<TierRole[]>> {
  if (!tierIdSchema.safeParse(viewerId).success) {
    return { ok: false, status: 400, code: 'INVALID_REQUEST' }
  }
  return execute(async () => listTierRoles(await authorizedToken(viewerId)))
}

export async function createTierForHook(
  viewerId: number,
  input: CreateTierPayload
): Promise<ApiActionResult<number>> {
  return mutation(async () => {
    const parsed = tierInputSchema.safeParse(input)
    if (!parsed.success) invalidTier()
    return createTier(await authorizedToken(viewerId), parsed.data)
  })
}

export async function updateTierForHook(
  viewerId: number,
  input: CreateTierPayload & { id: number }
): Promise<ApiActionResult<number>> {
  return mutation(async () => {
    const parsed = tierUpdateInputSchema.safeParse(input)
    if (!parsed.success) invalidTier()
    const { id, ...payload } = parsed.data
    return updateTier(await authorizedToken(viewerId), id, payload)
  })
}

export async function deleteTierForHook(
  viewerId: number,
  tierId: number
): Promise<ApiActionResult<null>> {
  return mutation(async () => {
    if (!tierIdSchema.safeParse(tierId).success) invalidTier()
    await deleteTier(await authorizedToken(viewerId), tierId)
    return null
  })
}
