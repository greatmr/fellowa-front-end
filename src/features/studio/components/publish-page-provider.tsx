'use client'

import { useTranslations } from 'next-intl'
import {
  createContext,
  useContext,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'

import { publishPageAction } from '@/features/studio/server/actions'
import { useRouter } from '@/i18n/navigation'

type PublishPage = {
  /** Starts the one publish request; ignored while one is in flight. */
  publish: () => void
  /** In flight, or succeeded and waiting for the refreshed page. */
  pending: boolean
}

const PublishPageContext = createContext<PublishPage | null>(null)

/**
 * The dashboard's one publish action (FE-STUDIO-03 row 3): the banner and the
 * checklist's publish row both call this, so there is one request, one
 * pending state that disables both, and one error message. On success the
 * page is refreshed so the checklist is re-read from the backend instead of
 * being ticked on the client; the backend still answers for the publish.
 */
export function PublishPageProvider({
  viewerId,
  children,
}: {
  viewerId: number
  children: ReactNode
}) {
  const t = useTranslations('studio.dashboard')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  // `pending` reaches the buttons only after a render; this stops a second
  // click in the same tick from sending a second request. After a success it
  // stays set: the refreshed page shows the published state, and until it
  // arrives both controls stay disabled.
  const inFlight = useRef(false)
  const [succeeded, setSucceeded] = useState(false)

  function publish() {
    if (inFlight.current) return
    inFlight.current = true
    startTransition(async () => {
      const result = await publishPageAction(viewerId).catch(() => null)
      if (!result?.ok) {
        inFlight.current = false
        toast.error(
          result?.status === 401
            ? t('sessionExpired')
            : result?.code === 'USER_ALIAS_REQUIRED'
              ? t('publishNeedsUsername')
              : t('publishFailed')
        )
        return
      }
      setSucceeded(true)
      toast.success(t('published'))
      router.refresh()
    })
  }

  return (
    <PublishPageContext value={{ publish, pending: pending || succeeded }}>
      {children}
    </PublishPageContext>
  )
}

export function usePublishPage(): PublishPage {
  const value = useContext(PublishPageContext)
  if (!value) {
    throw new Error('usePublishPage must be used inside PublishPageProvider')
  }
  return value
}
