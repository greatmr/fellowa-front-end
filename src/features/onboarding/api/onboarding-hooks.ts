'use client'

import { useMutation } from '@tanstack/react-query'

import {
  saveNamesAction,
  saveSocialLinksAction,
} from '@/features/onboarding/server/actions'
import type {
  OnboardingNames,
  SocialLinks,
} from '@/features/onboarding/types/onboarding'
import { unwrapApiActionResult } from '@/lib/api/action-result'
import type { ApiError } from '@/lib/api/errors'

export const onboardingKeys = {
  mutation: (name: string, viewerId: number) =>
    ['onboarding', name, viewerId] as const,
}

export function useSaveNamesMutation(viewerId: number) {
  return useMutation<OnboardingNames, ApiError, OnboardingNames>({
    mutationKey: onboardingKeys.mutation('names', viewerId),
    mutationFn: async (names) =>
      unwrapApiActionResult(await saveNamesAction(viewerId, names)),
  })
}

export function useSaveSocialLinksMutation(viewerId: number) {
  return useMutation<null, ApiError, SocialLinks>({
    mutationKey: onboardingKeys.mutation('social-links', viewerId),
    mutationFn: async (links) =>
      unwrapApiActionResult(await saveSocialLinksAction(viewerId, links)),
  })
}
