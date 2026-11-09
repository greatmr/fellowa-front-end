import 'server-only'

import {
  EMPTY_PERSONAL,
  parsePageNameState,
  parsePersonal,
} from '@/features/settings/schemas/settings'
import type {
  ChangePasswordPayload,
  FirstPasswordPayload,
  PageNameState,
  PersonalDetails,
} from '@/features/settings/types/settings'
import { apiGet, apiPut, withBearer } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'

/**
 * The caller's own personal record. Registration creates none, so the
 * backend answers 404 `USER_PERSONAL_NOT_FOUND` until the first save
 * (BE-USER-06) — that is an empty form, not an error.
 */
export async function getPersonal(token: string): Promise<PersonalDetails> {
  try {
    return parsePersonal(
      await apiGet<unknown>('/user/personal', withBearer(token))
    )
  } catch (error) {
    if (error instanceof ApiError && error.code === 'USER_PERSONAL_NOT_FOUND') {
      return EMPTY_PERSONAL
    }
    throw error
  }
}

/** Empty strings clear a field: the backend stores what it is sent. */
export async function updatePersonal(
  token: string,
  details: PersonalDetails
): Promise<void> {
  await apiPut<unknown, PersonalDetails>(
    '/user/personal',
    details,
    withBearer(token)
  )
}

/**
 * `PUT /auth/reset-password`: needs the current password; on success the
 * backend revokes every refresh token of the account (BE-AUTH-05).
 */
export async function changePassword(
  token: string,
  payload: ChangePasswordPayload
): Promise<void> {
  await apiPut<unknown, ChangePasswordPayload>(
    '/auth/reset-password',
    payload,
    withBearer(token)
  )
}

/**
 * `PUT /auth/account` with a password: a first password for an account made
 * by phone or Google (BE-AUTH-10). 409 `AUTH_PASSWORD_ALREADY_SET` when the
 * account already has one. The name is sent unchanged; while the page has no
 * public name it takes this one (BE-USER-07).
 */
export async function setFirstPassword(
  token: string,
  payload: FirstPasswordPayload
): Promise<void> {
  await apiPut<unknown, FirstPasswordPayload>(
    '/auth/account',
    payload,
    withBearer(token)
  )
}

/** The caller's page and its public name (`GET /user/about`, BE-USER-07). */
export async function getPageName(token: string): Promise<PageNameState> {
  return parsePageNameState(
    await apiGet<unknown>('/user/about', withBearer(token))
  )
}

/**
 * Only `pageName`: bio and links stay as they are. `null` clears it, and the
 * page shows `@alias` again. With no page the backend answers 400
 * `USER_ALIAS_REQUIRED`.
 */
export async function updatePageName(
  token: string,
  pageName: string | null
): Promise<void> {
  await apiPut<unknown, { pageName: string | null }>(
    '/user/about',
    { pageName },
    withBearer(token)
  )
}
