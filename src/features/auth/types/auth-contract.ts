/** Request bodies from the live auth controller DTOs. */
export type CredentialsPayload = { email: string; password: string }
export type VerificationCodePayload = { code: string }
export type SetAliasPayload = { alias: string }
export type ForgotPasswordPayload = { email: string }
export type ConfirmPasswordResetPayload = {
  token: string
  newPassword: string
}
export type ResetPasswordPayload = {
  currentPassword: string
  newPassword: string
}
export type GoogleAuthPayload = { code: string; redirectUri: string }
export type VerifyTokenPayload = { token: string }

/** Phone sign-in (BE-AUTH-08, `phone-*.dto.ts`, `complete-account.dto.ts`). */
export type PhoneCodeRequestPayload = { phone: string }
export type PhoneVerifyPayload = { phone: string; code: string }
export type PhoneLoginPayload = { phone: string; password: string }
export type CompleteAccountPayload = { displayName: string; password?: string }
