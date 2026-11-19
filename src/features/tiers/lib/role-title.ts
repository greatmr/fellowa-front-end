import type { TierRole } from '@/features/tiers/types/tier'

/** A preset benefit's name in the active language (`benefit_template`). */
export function roleTitle(role: TierRole, locale: string): string {
  return locale === 'fa' ? role.persianTitle || role.title : role.title
}
