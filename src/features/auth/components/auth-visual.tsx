'use client'

import type { ReactNode } from 'react'

import { PAGE_ADDRESS_PATH } from '@/features/auth/lib/auth-steps'
import { usePathname } from '@/i18n/navigation'

import { useAuthFlow } from './auth-flow-context'
import { CreatorPreviewCard } from './creator-preview-card'

/**
 * What the visual column shows: the live page preview on the address step,
 * the sample creator cards everywhere else (presentation `AuthLayout`).
 */
export function AuthVisual({ samples }: { samples: ReactNode }) {
  const pathname = usePathname()
  const { pageName, pageAddress } = useAuthFlow()

  return pathname === PAGE_ADDRESS_PATH ? (
    <div className="flex w-full justify-center">
      <CreatorPreviewCard name={pageName} address={pageAddress} />
    </div>
  ) : (
    samples
  )
}
