'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Tier } from '@/features/tiers/types/tier'

type Props = {
  target: Tier | null
  pending: boolean
  failed: boolean
  onConfirm: (tier: Tier) => void
  onClose: () => void
}

export function TierDeleteDialog({
  target,
  pending,
  failed,
  onConfirm,
  onClose,
}: Props) {
  const t = useTranslations('tiers')
  const tCommon = useTranslations('common')

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent closeLabel={tCommon('close')}>
        <DialogHeader>
          <DialogTitle>{t('deleteTitle')}</DialogTitle>
          <DialogDescription>
            {t('deleteBody', { title: target?.title ?? '' })}
          </DialogDescription>
        </DialogHeader>
        {failed ? (
          <p role="alert" className="text-body-sm text-destructive">
            {t('deleteError')}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (target) onConfirm(target)
            }}
          >
            {pending ? t('deleting') : t('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
