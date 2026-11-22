'use client'

import { useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'

/** Re-reads the current server-rendered page, for a widget's "try again". */
export function RefreshButton({ label }: { label: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {label}
    </Button>
  )
}
