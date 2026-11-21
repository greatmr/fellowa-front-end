'use client'

/**
 * Client-side public surface other features may use. Separate from
 * `index.ts`, which server code imports: the hooks import the API client,
 * and with it the environment check, which `index.ts` must not pull in.
 */
export { useTiersQuery } from '@/features/tiers/api/tier-hooks'
export type { Tier } from '@/features/tiers/types/tier'
