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
