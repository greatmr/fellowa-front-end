import 'server-only'

import {
  parseTierCoverUpload,
  parseTierDelete,
  parseTierDetailCover,
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

/** `GET /tire/:id`, read for the cover URL `GET /tire` does not give. */
export async function getTierCover(token: string, tierId: number) {
  return parseTierDetailCover(
    await apiGet<unknown>(`/tire/${tierId}`, withBearer(token))
  )
}

/** `POST /tire/cover`: multipart, field `image`. */
export async function uploadTierCover(token: string, image: File) {
  const body = new FormData()
  body.append('image', image, image.name)
  return parseTierCoverUpload(
    await apiPost<unknown, FormData>('/tire/cover', body, withBearer(token))
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
