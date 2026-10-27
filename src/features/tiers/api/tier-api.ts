import 'server-only'

import {
  parseTierDelete,
  parseTierList,
  parseTierRoles,
  parseTierWrite,
} from '@/features/tiers/schemas/tier'
import type {
  CreateTierPayload,
  UpdateTierPayload,
} from '@/features/tiers/types/tier'
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  withBearer,
} from '@/lib/api/client'

export async function listOwnTiers(token: string) {
  return parseTierList(await apiGet<unknown>('/tire', withBearer(token)))
}

export async function listTierRoles(token: string) {
  return parseTierRoles(await apiGet<unknown>('/tire/role', withBearer(token)))
}

export async function createTier(token: string, payload: CreateTierPayload) {
  return parseTierWrite(
    await apiPost<unknown, CreateTierPayload>(
      '/tire',
      payload,
      withBearer(token)
    )
  )
}

export async function updateTier(
  token: string,
  tierId: number,
  payload: UpdateTierPayload
) {
  return parseTierWrite(
    await apiPut<unknown, UpdateTierPayload>(
      `/tire/${tierId}`,
      payload,
      withBearer(token)
    )
  )
}

export async function deleteTier(token: string, tierId: number) {
  parseTierDelete(
    await apiDelete<unknown>(`/tire/${tierId}`, withBearer(token))
  )
}
