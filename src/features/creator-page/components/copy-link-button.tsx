'use client'

import { Share2Icon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ComponentProps } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

/**
 * Copies the page's public address (`NEXT_PUBLIC_APP_URL` + `/creators/:id`,
 * as FE-STUDIO-03's address row). Disabled when the origin is not
 * configured, so nothing relative is copied as if it were shareable.
 * `iconOnly` keeps the label for assistive technology. `messages` replaces
 * the page-link toasts when another link is copied (a post's, FE-DASH-04).
 */
export function CopyLinkButton({
  url,
  label,
  iconOnly = false,
  messages,
  ...props
}: Omit<ComponentProps<typeof Button>, 'onClick' | 'asChild' | 'children'> & {
  url: string | null
  label: string
  iconOnly?: boolean
  messages?: { copied: string; failed: string }
}) {
  const t = useTranslations('creatorPage')

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success(messages?.copied ?? t('linkCopied'))
    } catch {
      toast.error(messages?.failed ?? t('copyFailed'))
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      {...props}
      disabled={url === null}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      onClick={() => void copy()}
    >
      <Share2Icon aria-hidden />
      {iconOnly ? null : label}
    </Button>
  )
}
