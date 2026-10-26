import 'server-only'

import {
  parseTierDelete,
  parseTierList,
  parseTierRoles,
  parseTierWrite,
  type CreateTierPayload,
  type UpdateTierPayload,
} from '@/features/tiers/types/tier'
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api/client'

function bearer(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } }
}

export async function listOwnTiers(token: string) {
  return parseTierList(await apiGet<unknown>('/tire', bearer(token)))
}

export async function listTierRoles(token: string) {
  return parseTierRoles(await apiGet<unknown>('/tire/role', bearer(token)))
}

export async function createTier(token: string, payload: CreateTierPayload) {
  return parseTierWrite(
    await apiPost<unknown, CreateTierPayload>('/tire', payload, bearer(token))
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
      bearer(token)
    )
  )
}

export async function deleteTier(token: string, tierId: number) {
  parseTierDelete(await apiDelete<unknown>(`/tire/${tierId}`, bearer(token)))
}
