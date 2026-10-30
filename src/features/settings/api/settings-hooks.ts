'use client'

import { useMutation } from '@tanstack/react-query'

import {
  changePasswordAction,
  updatePersonalAction,
} from '@/features/settings/server/actions'
import type {
  ChangePasswordPayload,
  PersonalDetails,
} from '@/features/settings/types/settings'
import { unwrapApiActionResult } from '@/lib/api/action-result'
import type { ApiError } from '@/lib/api/errors'

export const settingsKeys = {
  mutation: (name: string, viewerId: number) =>
    ['settings', name, viewerId] as const,
}

export function useUpdatePersonalMutation(viewerId: number) {
  return useMutation<PersonalDetails, ApiError, PersonalDetails>({
    mutationKey: settingsKeys.mutation('personal', viewerId),
    mutationFn: async (details) =>
      unwrapApiActionResult(await updatePersonalAction(viewerId, details)),
  })
}

export function useChangePasswordMutation(viewerId: number) {
  return useMutation<null, ApiError, ChangePasswordPayload>({
    mutationKey: settingsKeys.mutation('password', viewerId),
    mutationFn: async (payload) =>
      unwrapApiActionResult(await changePasswordAction(viewerId, payload)),
  })
}
