/**
 * Account settings (FE-SET-01). The private personal record
 * (`GET`/`PUT /user/personal`) — only the fields the form edits.
 */
export type PersonalDetails = {
  firstName: string
  lastName: string
  phoneNumber: string
}

export type ChangePasswordPayload = {
  currentPassword: string
  newPassword: string
}

/**
 * The page's public name (BE-USER-07, FQ-17), from `GET /user/about`. An
 * account with no page yet (`id: null`) has nothing to name: the backend
 * answers 400 `USER_ALIAS_REQUIRED` until it picks an address.
 */
export type PageNameState = {
  hasPage: boolean
  pageName: string | null
}
