'use client'

import { RocketIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { usePublishPage } from '@/features/studio/components/publish-page-provider'

/**
 * The banner's publish button. `blockedReason` is why the button is offered
 * disabled (no username or no tier yet, CP-05). The request and its pending
 * state are the shared `PublishPageProvider`'s, so this button and the
 * checklist's publish row never send two requests. The banner shows it as
 * the design's dark button with a rocket (`variant="inverse"`, `withIcon`).
 */
export function PublishButton({
  blockedReason,
  variant = 'default',
  withIcon = false,
}: {
  blockedReason: string | null
  variant?: 'default' | 'inverse'
  withIcon?: boolean
}) {
  const t = useTranslations('studio.dashboard')
  const { publish, pending } = usePublishPage()

  return (
    <div className="grid justify-items-start gap-1.5">
      <Button
        size="sm"
        variant={variant}
        disabled={pending || blockedReason !== null}
        onClick={publish}
      >
        {withIcon ? <RocketIcon aria-hidden /> : null}
        {t('steps.publish.action')}
      </Button>
      {blockedReason ? (
        <p className="text-label text-muted-foreground">{blockedReason}</p>
      ) : null}
    </div>
  )
}
