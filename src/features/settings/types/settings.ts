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
 * `PUT /auth/account` (BE-AUTH-08) as settings uses it: a first password for
 * an account that has none. `displayName` is the account's current name,
 * which the endpoint requires; the server action fills it from the session.
 */
export type FirstPasswordPayload = {
  displayName: string
  password: string
}

/**
 * The password section's state, from the owner profile the session reads
 * (`GET /user/:id/profile`, BE-AUTH-10).
 */
export type PasswordState = {
  hasPassword: boolean
  /**
   * `PUT /auth/account` needs the name back (2–80 characters); an account
   * without such a name has none to send.
   */
  hasDisplayName: boolean
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
