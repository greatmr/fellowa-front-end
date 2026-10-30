import 'server-only'

import {
  parseCreatorPosts,
  parseCreatorProfile,
  parseCreatorTiers,
} from '@/features/creator-page/schemas/creator-page'
import { apiGet } from '@/lib/api/client'

/**
 * Public creator page reads (BE-LAND-03). No token: the page is public data,
 * and an unknown or unpublished creator is a 404 on every route.
 */
export async function getCreatorProfile(id: number) {
  return parseCreatorProfile(await apiGet<unknown>(`/landing/creators/${id}`))
}

export async function getCreatorTiers(id: number) {
  return parseCreatorTiers(
    await apiGet<unknown>(`/landing/creators/${id}/tiers`)
  )
}

export async function getCreatorPosts(id: number) {
  return parseCreatorPosts(
    await apiGet<unknown>(`/landing/creators/${id}/content`)
  )
}
