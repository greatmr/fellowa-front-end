'use client'

import type { ReactNode } from 'react'

import {
  INTERESTS_PATH,
  PAGE_ADDRESS_PATH,
} from '@/features/auth/lib/auth-steps'
import { usePathname } from '@/i18n/navigation'

import { useAuthFlow } from './auth-flow-context'
import { CreatorPreviewCard } from './creator-preview-card'
import { InterestsPreview } from './interests-preview'

/**
 * What the visual column shows: the live page preview on the address step,
 * the sample creators re-ordered by the picks on the interests step, the
 * sample creator cards everywhere else (presentation `AuthLayout`).
 */
export function AuthVisual({ samples }: { samples: ReactNode }) {
  const pathname = usePathname()
  const { pageName, pageAddress } = useAuthFlow()

  if (pathname === PAGE_ADDRESS_PATH) {
    return (
      <div className="flex w-full justify-center">
        <CreatorPreviewCard name={pageName} address={pageAddress} />
      </div>
    )
  }
  if (pathname === INTERESTS_PATH) {
    return <InterestsPreview fallback={samples} />
  }
  return samples
}
