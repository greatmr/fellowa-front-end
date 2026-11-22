'use client'

import { CopyIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

/**
 * The public address with a copy button (presentation `DashboardView`
 * :449-466 @ d843c3b), showing the real address `/creators/:id` (C-9)
 * instead of the prototype's `fellowa.ir/{slug}`. Always shown; copying is
 * held back until the page is published, because an unpublished page
 * answers 404 to everyone else (FQ-29 default).
 */
export function PublicAddressRow({
  path,
  url,
  isPublished,
}: {
  path: string
  /** Absolute; `null` when the app origin is not configured. */
  url: string | null
  isPublished: boolean
}) {
  const t = useTranslations('panel.dashboard.address')
  const canCopy = isPublished && url !== null

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('copied'))
    } catch {
      toast.error(t('copyFailed'))
    }
  }

  return (
    <section
      aria-label={t('label')}
      className="grid gap-2 rounded-md border bg-muted/60 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <bdi
          dir="ltr"
          className="min-w-0 text-body font-semibold break-all text-primary"
        >
          {url ?? path}
        </bdi>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canCopy}
          onClick={() => void copy()}
        >
          <CopyIcon aria-hidden />
          {t('copy')}
        </Button>
      </div>
      {isPublished ? null : (
        <p className="text-label text-muted-foreground">{t('notPublic')}</p>
      )}
    </section>
  )
}
