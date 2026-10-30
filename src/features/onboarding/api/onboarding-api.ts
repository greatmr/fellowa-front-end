import 'server-only'

import {
  EMPTY_SOCIAL_LINKS,
  parseSocialLinks,
} from '@/features/onboarding/schemas/onboarding'
import type {
  OnboardingNames,
  SocialLinks,
} from '@/features/onboarding/types/onboarding'
import { apiGet, apiPut, withBearer } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'

/** No about record yet is a step left to do, not an error. */
export async function getSocialLinks(token: string): Promise<SocialLinks> {
  try {
    return parseSocialLinks(
      await apiGet<unknown>('/user/about', withBearer(token))
    )
  } catch (error) {
    if (error instanceof ApiError && error.code === 'USER_ABOUT_NOT_FOUND') {
      return EMPTY_SOCIAL_LINKS
    }
    throw error
  }
}

/** Only the two name fields: a saved phone number stays as it is. */
export async function updateNames(
  token: string,
  names: OnboardingNames
): Promise<void> {
  await apiPut<unknown, OnboardingNames>(
    '/user/personal',
    names,
    withBearer(token)
  )
}

/**
 * Only the links this flow edits: a saved bio stays as it is. `null` clears a
 * link. Answers 404 `USER_ABOUT_NOT_FOUND` for an account with no about record,
 * which the step shows as a failed save it can skip past.
 */
export async function updateSocialLinks(
  token: string,
  links: SocialLinks
): Promise<void> {
  await apiPut<unknown, SocialLinks>('/user/about', links, withBearer(token))
}
