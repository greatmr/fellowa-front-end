'use client'

import { useTranslations } from 'next-intl'
import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { setFollowingAction } from '@/features/creator-page/server/actions'
import { useRouter } from '@/i18n/navigation'

/**
 * Follow / Unfollow for a signed-in visitor (FE-PAGE-02). `following` is the
 * server's answer (it arrives with the page); while a change is in flight the
 * button shows it optimistically, then the page is refreshed so both the state
 * and the follower count come from the backend again — never a client +1.
 */
export function FollowButton({
  creatorId,
  following,
}: {
  creatorId: number
  following: boolean
}) {
  const t = useTranslations('creatorPage')
  const router = useRouter()
  const [shown, setShown] = useOptimistic(following)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const follow = !shown
    startTransition(async () => {
      setShown(follow)
      const result = await setFollowingAction({ creatorId, follow })
      if (!result.ok) {
        // The optimistic state falls back to `following` when this ends.
        toast.error(
          result.status === 401 ? t('sessionExpired') : t('followFailed')
        )
        return
      }
      router.refresh()
    })
  }

  return (
    <Button variant="outline" disabled={pending} onClick={toggle}>
      {shown ? t('following') : t('follow')}
    </Button>
  )
}
