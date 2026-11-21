import 'server-only'

import {
  parseTierCoverUpload,
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

/**
 * A cover of up to 10 MB goes Next → API → object storage before the API
 * answers; the client's 20 s default is too short for that on a slow link.
 * This request only (FE-TIER-04, [PROP] 60 s); every other call keeps 20 s.
 */
export const TIER_COVER_UPLOAD_TIMEOUT_MS = 60_000

/** `POST /tire/cover`: multipart, field `image`. */
export async function uploadTierCover(token: string, image: File) {
  const body = new FormData()
  body.append('image', image, image.name)
  return parseTierCoverUpload(
    await apiPost<unknown, FormData>('/tire/cover', body, {
      ...withBearer(token),
      timeout: TIER_COVER_UPLOAD_TIMEOUT_MS,
    })
  )
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
  payload: Omit<UpdateTierPayload, 'id'>
) {
  return parseTierWrite(
    await apiPut<unknown, Omit<UpdateTierPayload, 'id'>>(
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
