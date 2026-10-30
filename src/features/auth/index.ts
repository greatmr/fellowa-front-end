/** Client-side surface other features may use. */
export { useSetAliasMutation } from '@/features/auth/api/auth-hooks'
export {
  ALIAS_MAX_LENGTH,
  ALIAS_MIN_LENGTH,
  createAliasSchema,
  normalizeAlias,
} from '@/features/auth/schemas'
