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

type Props = {
  /** The tier's title while the dialog is open; `null` closes it. */
  title: string | null
  pending: boolean
  failed: boolean
  onConfirm: () => void
  onClose: () => void
}

/** `DELETE /tire/:id` archives the tier; the copy is Q-22's (owner 2026-11-19). */
export function TierDeleteDialog({
  title,
  pending,
  failed,
  onConfirm,
  onClose,
}: Props) {
  const t = useTranslations('tiers.delete')
  const tCommon = useTranslations('common')

  return (
    <Dialog
      open={title !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent closeLabel={tCommon('close')}>
        <DialogHeader>
          <DialogTitle>{t('title', { title: title ?? '' })}</DialogTitle>
          <DialogDescription className="leading-6">
            {t('body')}
          </DialogDescription>
        </DialogHeader>
        {failed ? (
          <p role="alert" className="text-body-sm text-destructive">
            {t('error')}
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
            onClick={onConfirm}
          >
            {pending ? t('deleting') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
