'use server'

import { authorizedViewerToken } from '@/features/auth/server'
import {
  updateNames,
  updateSocialLinks,
} from '@/features/onboarding/api/onboarding-api'
import {
  createNamesSchema,
  socialLinksSchema,
} from '@/features/onboarding/schemas/onboarding'
import type {
  OnboardingNames,
  SocialLinks,
} from '@/features/onboarding/types/onboarding'
import { runApiAction, type ApiActionResult } from '@/lib/api/action-result'

/** The steps validate for the user; these re-check what reaches the API. */
export async function saveNamesAction(
  viewerId: number,
  input: OnboardingNames
): Promise<ApiActionResult<OnboardingNames>> {
  const parsed = createNamesSchema().safeParse(input)
  if (!parsed.success)
    return { ok: false, status: 400, code: 'INVALID_REQUEST' }
  const token = await authorizedViewerToken(viewerId)
  if (!token.ok) return token
  return runApiAction(async () => {
    await updateNames(token.data, parsed.data)
    return parsed.data
  })
}

export async function saveSocialLinksAction(
  viewerId: number,
  input: SocialLinks
): Promise<ApiActionResult<null>> {
  const parsed = socialLinksSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, status: 400, code: 'INVALID_REQUEST' }
  const token = await authorizedViewerToken(viewerId)
  if (!token.ok) return token
  return runApiAction(async () => {
    await updateSocialLinks(token.data, parsed.data)
    return null
  })
}
