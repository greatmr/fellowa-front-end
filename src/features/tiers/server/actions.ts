'use server'

import { z } from 'zod'

import {
  createTier,
  deleteTier,
  listOwnTiers,
  listTierRoles,
  updateTier,
} from '@/features/tiers/api/tier-api'
import {
  InvalidTierResponseError,
  type CreateTierPayload,
  type Tier,
  type TierRole,
} from '@/features/tiers/types/tier'
import { validAuthRequestOrigin } from '@/features/auth/server/request-security'
import { readSession } from '@/features/auth/server/session'
import type { ApiActionResult } from '@/lib/api/action-result'
import { ApiError } from '@/lib/api/errors'

const idSchema = z.number().int().positive().safe()
const benefitSchema = z.object({
  title: z.string().trim().min(1).max(255),
  roleId: idSchema,
})
const tierSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().optional(),
  price: z.number().int().positive().safe().max(9_999_999_999),
  benefits: z.array(benefitSchema).optional(),
})
const updateSchema = tierSchema.extend({ id: idSchema })

async function execute<T>(
  operation: () => Promise<T>
): Promise<ApiActionResult<T>> {
  try {
    return { ok: true, data: await operation() }
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        ok: false,
        status: error.status,
        code: error.code,
        isNetworkError: error.isNetworkError,
      }
    }
    if (error instanceof InvalidTierResponseError) {
      return { ok: false, code: 'INVALID_TIER_RESPONSE' }
    }
    return { ok: false }
  }
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

export async function listTiersForHook(
  viewerId: number
): Promise<ApiActionResult<Tier[]>> {
  if (!idSchema.safeParse(viewerId).success) {
    return { ok: false, status: 400, code: 'INVALID_REQUEST' }
  }
  return execute(async () => listOwnTiers(await authorizedToken(viewerId)))
}

export async function listTierRolesForHook(
  viewerId: number
): Promise<ApiActionResult<TierRole[]>> {
  if (!idSchema.safeParse(viewerId).success) {
    return { ok: false, status: 400, code: 'INVALID_REQUEST' }
  }
  return execute(async () => listTierRoles(await authorizedToken(viewerId)))
}

export async function createTierForHook(
  viewerId: number,
  input: CreateTierPayload
): Promise<ApiActionResult<number>> {
  return mutation(async () => {
    const parsed = tierSchema.safeParse(input)
    if (!parsed.success)
      throw new ApiError({ message: 'Invalid tier', status: 400 })
    return createTier(await authorizedToken(viewerId), parsed.data)
  })
}

export async function updateTierForHook(
  viewerId: number,
  input: CreateTierPayload & { id: number }
): Promise<ApiActionResult<number>> {
  return mutation(async () => {
    const parsed = updateSchema.safeParse(input)
    if (!parsed.success)
      throw new ApiError({ message: 'Invalid tier', status: 400 })
    const { id, ...payload } = parsed.data
    return updateTier(await authorizedToken(viewerId), id, payload)
  })
}

export async function deleteTierForHook(
  viewerId: number,
  tierId: number
): Promise<ApiActionResult<null>> {
  return mutation(async () => {
    if (!idSchema.safeParse(tierId).success) {
      throw new ApiError({ message: 'Invalid tier', status: 400 })
    }
    await deleteTier(await authorizedToken(viewerId), tierId)
    return null
  })
}
