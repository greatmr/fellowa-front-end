'use client'

import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { publishPageAction } from '@/features/studio/server/actions'
import { useRouter } from '@/i18n/navigation'

/**
 * Publishes the creator's page. `blockedReason` is why the button is offered
 * disabled (no username or no tier yet, CP-05); the backend still answers for
 * the publish. On success the page is refreshed so the checklist is re-read
 * from the backend instead of being ticked on the client.
 */
export function PublishButton({
  viewerId,
  blockedReason,
}: {
  viewerId: number
  blockedReason: string | null
}) {
  const t = useTranslations('studio.dashboard')
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function publish() {
    startTransition(async () => {
      const result = await publishPageAction(viewerId)
      if (!result.ok) {
        toast.error(
          result.status === 401
            ? t('sessionExpired')
            : result.code === 'USER_ALIAS_REQUIRED'
              ? t('publishNeedsUsername')
              : t('publishFailed')
        )
        return
      }
      toast.success(t('published'))
      router.refresh()
    })
  }

  return (
    <div className="grid justify-items-start gap-1.5">
      <Button
        size="sm"
        disabled={pending || blockedReason !== null}
        onClick={publish}
      >
        {t('steps.publish.action')}
      </Button>
      {blockedReason ? (
        <p className="text-label text-muted-foreground">{blockedReason}</p>
      ) : null}
    </div>
  )
}
